from typing import TypedDict


class RepoState(TypedDict):
    repo_url: str

    # ── Fetched from GitHub (filled by ingest node) ──────────────────────────
    repo_name: str
    repo_description: str
    repo_language: str
    repo_stars: int
    repo_license: str
    repo_topics: list[str]
    repo_structure: list[str]
    readme: str
    contributing: str
    fetched_files: dict[str, str]

    # ── LLM-generated (filled by summarize node) ──────────────────────────────
    repo_summary: str
    architecture_notes: str

    # ── Conversation (filled by answer node) ──────────────────────────────────
    chat_history: list[dict]
    current_question: str
    current_answer: str
