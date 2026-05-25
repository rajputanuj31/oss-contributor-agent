import asyncio
import sys
from functools import lru_cache
from pathlib import Path

# Ensure backend root is on path when this module is imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
# pyrefly: ignore [missing-import]
from graph.state import RepoState
from onboard_github import fetch_repo_details, parse_github_repo_url, fetch_specific_file
from prompts import SUMMARIZE_REPO_PROMPT, ARCHITECTURE_PROMPT, ANSWER_QUESTION_PROMPT


@lru_cache(maxsize=1)
def _llm() -> ChatOpenAI:
    """Lazy-initialize the LLM so load_dotenv() in main.py runs first."""
    return ChatOpenAI(model="gpt-4o-mini", max_tokens=1024, temperature=0.0)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_file_contents(files: dict[str, str], char_limit: int = 12_000) -> str:
    """Concatenate fetched files into a single string, respecting a char limit."""
    parts = []
    total = 0
    for filename, content in files.items():
        block = f"\n=== {filename} ===\n{content}"
        if total + len(block) > char_limit:
            break
        parts.append(block)
        total += len(block)
    return "".join(parts)


# ── Nodes ─────────────────────────────────────────────────────────────────────

async def ingest_repo(state: RepoState) -> dict:
    """Fetch all repository data from GitHub and populate state."""
    print(f"\n[INGEST] Fetching {state['repo_url']} ...")

    repo_path = parse_github_repo_url(state["repo_url"])
    details = await fetch_repo_details(repo_path)

    print(f"[INGEST] {details.repo} — {details.repo_stars}★  {details.repo_language}")
    print(f"[INGEST] Files: {list(details.files.keys())}")

    return {
        "repo_name": details.repo,
        "repo_description": details.description,
        "repo_language": details.repo_language,
        "repo_stars": details.repo_stars,
        "repo_license": details.license,
        "repo_topics": details.topics,
        "repo_structure": details.structure,
        "readme": details.readme,
        "contributing": details.contributing,
        "fetched_files": details.files,
    }


async def summarize_repo(state: RepoState) -> dict:
    """Generate repo summary and architecture notes in parallel."""
    print(f"\n[SUMMARIZE] Analyzing {state['repo_name']} ...")

    structure_str = "\n".join(state["repo_structure"])

    # Include readme + contributing in the file contents for summarization
    all_files: dict[str, str] = {}
    if state["readme"]:
        all_files["README"] = state["readme"]
    if state["contributing"]:
        all_files["CONTRIBUTING"] = state["contributing"]
    all_files.update(state["fetched_files"])

    file_contents_full = _build_file_contents(all_files, char_limit=12_000)
    file_contents_short = _build_file_contents(all_files, char_limit=6_000)

    summary_prompt = SUMMARIZE_REPO_PROMPT.format(
        repo_name=state["repo_name"],
        repo_description=state["repo_description"],
        repo_language=state["repo_language"],
        repo_stars=state["repo_stars"],
        topics=", ".join(state["repo_topics"]),
        structure=structure_str,
        file_contents=file_contents_full,
    )

    arch_prompt = ARCHITECTURE_PROMPT.format(
        repo_name=state["repo_name"],
        repo_language=state["repo_language"],
        structure=structure_str,
        file_contents=file_contents_short,
    )

    # Run both LLM calls in parallel
    summary_response, arch_response = await asyncio.gather(
        _llm().ainvoke(summary_prompt),
        _llm().ainvoke(arch_prompt),
    )

    print("[SUMMARIZE] Done")

    return {
        "repo_summary": summary_response.content,
        "architecture_notes": arch_response.content,
    }


async def answer_question(state: RepoState) -> dict:
    """Answer a user question using session context and ReAct tool loop."""
    print(f"\n[ANSWER] {state['current_question']}")

    # 1. Gather file contents currently in context
    all_files: dict[str, str] = {}
    if state["readme"]:
        all_files["README"] = state["readme"][:4000]
    if state["contributing"]:
        all_files["CONTRIBUTING"] = state["contributing"][:2000]
    all_files.update(state["fetched_files"])

    file_contents = _build_file_contents(all_files, char_limit=8_000)

    structure_str = "\n".join(state["repo_structure"])

    # 2. Build the System Prompt
    system_text = f"""You are an expert on the "{state['repo_name']}" GitHub repository.

Here is everything you know about it:

## Summary
{state['repo_summary']}

## Architecture
{state['architecture_notes']}

## Repository Directory Layout
{structure_str}

## Key File Contents
{file_contents}

CRITICAL RULES:
1. You MUST NOT use your general knowledge to answer questions about the repository's features, logic, or implementation.
2. Answer based strictly on the repository content and the files you fetch.
3. DO NOT hallucinate, guess, or make up code snippets, routes, file names, or application logic.
4. If the user's question asks about how a feature works (e.g., "how to upload a video", "what is the flow"), you MUST FIRST identify the relevant files from the 'Repository Directory Layout' and call the `read_codebase_file` tool to read them. DO NOT give a generic explanation of how such a feature typically works.
5. You are strictly forbidden from writing example or placeholder code (like generic express, django, or react handlers) unless they are verbatim present in the 'Key File Contents'. If you cannot find the actual code, use the tool to fetch it.
6. If the files cannot be found or read, state clearly that you cannot find the implementation.
"""

    # 3. Create the messages list
    messages = []
    messages.append(SystemMessage(content=system_text))

    # Add chat history (up to last 6 messages)
    for msg in state.get("chat_history", [])[-6:]:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))

    # Add current question
    messages.append(HumanMessage(content=state["current_question"]))

    # 4. Define the local read_codebase_file tool closed over repo_name
    repo_name = state["repo_name"]

    @tool
    async def read_codebase_file(filepath: str) -> str:
        """
        Read the contents of a specific file in the repository codebase.
        filepath should be the relative path of the file from the repository root (e.g. 'src/utils/api.ts').
        """
        content = await fetch_specific_file(repo_name, filepath)
        if content:
            return content
        return f"Error: Could not read file '{filepath}'. Make sure the path is correct and exists."

    # 5. Bind tool to ChatOpenAI
    llm_with_tools = _llm().bind_tools([read_codebase_file])

    # 6. ReAct Loop (Up to 3 iterations)
    max_iterations = 3
    for i in range(max_iterations):
        response = await llm_with_tools.ainvoke(messages)
        
        if not response.tool_calls:
            # Final answer reached (no tool calls)
            break
            
        messages.append(response)
        
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            if tool_name == "read_codebase_file":
                filepath = tool_args.get("filepath")
                print(f"[REACT] Tool Call: read_codebase_file('{filepath}')")
                
                # Execute the tool
                tool_output = await read_codebase_file.ainvoke(tool_call)
                
                # Append ToolMessage with the output
                messages.append(ToolMessage(content=str(tool_output), tool_call_id=tool_id))
            else:
                messages.append(ToolMessage(content=f"Error: Unknown tool '{tool_name}'", tool_call_id=tool_id))

    # The final response content is stored in response.content
    final_answer = response.content

    updated_history = list(state.get("chat_history", [])) + [
        {"role": "user", "content": state["current_question"]},
        {"role": "assistant", "content": final_answer},
    ]

    print("[ANSWER] Done")

    return {
        "current_answer": final_answer,
        "chat_history": updated_history,
    }
