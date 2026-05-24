# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class RepoOnboardRequest(BaseModel):
    repo_url: str = Field(description="e.g. https://github.com/Significant-Gravitas/AutoGPT")


class RepoDetails(BaseModel):
    repo: str
    readme: str
    contributing: str
    repo_stars: int
    repo_language: str
    license: str
    description: str
    topics: list[str] = Field(default_factory=list)
    files: dict[str, str] = Field(default_factory=dict)
    structure: list[str] = Field(default_factory=list)
class RepoFileRequest(BaseModel):
    repo_url: str = Field(description="e.g. https://github.com/Significant-Gravitas/AutoGPT")
    filepath: str = Field(description="e.g. package.json")


class RepoFileResponse(BaseModel):
    repo: str
    filepath: str
    content: str | None
