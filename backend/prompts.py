"""
Prompt templates for the OSS onboarding agent.

All prompts use plain str.format() — no LangChain PromptTemplate needed.
"""

# ── Summarize node ────────────────────────────────────────────────────────────

SUMMARIZE_REPO_PROMPT = """\
You are analyzing a GitHub repository to help developers understand it quickly.

Repository: {repo_name}
Description: {repo_description}
Primary Language: {repo_language}
Stars: {repo_stars}
Topics: {topics}

Directory Structure:
{structure}

File Contents:
{file_contents}

Write a clear, practical summary covering:
1. What this project does (2-3 sentences)
2. Who it is for (end users, library consumers, contributors)
3. Main components and what each one does
4. Key technologies and dependencies
5. How to get started (setup, install, first run)

Rules:
- Be specific — use actual file names, class names, and module names from the content above
- Under 400 words
- No fluff
"""

ARCHITECTURE_PROMPT = """\
Based on the repository structure and files below, describe the architecture concisely.

Repository: {repo_name}
Language: {repo_language}

Directory Structure:
{structure}

File Contents:
{file_contents}

Describe:
1. Overall architectural pattern (MVC, library, CLI tool, microservice, etc.)
2. Main entry points
3. How the key modules/packages relate to each other
4. Data flow if applicable (e.g. request → router → handler → response)

Rules:
- 200 words max
- Use bullet points
- Only mention files/modules that are actually present above
"""

# ── Answer node ───────────────────────────────────────────────────────────────

ANSWER_QUESTION_PROMPT = """\
You are an expert on the "{repo_name}" GitHub repository.

Here is everything you know about it:

## Summary
{repo_summary}

## Architecture
{architecture_notes}

## Key File Contents
{file_contents}

## Conversation So Far
{chat_history}

## User's Question
{question}

Answer based strictly on the repository content above.
- Be specific — reference actual files, functions, and class names by name
- Include small code snippets when they add clarity
- If the answer requires a file you don't have, say exactly which file would help
- Keep answers focused and practical (no filler)
"""
