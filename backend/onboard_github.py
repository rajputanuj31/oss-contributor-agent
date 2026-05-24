import re
import asyncio
import httpx
from config import settings
from models import RepoDetails
from utils.http_cache import cached_get

HEADERS = {
    "Authorization": f"Bearer {settings.github_token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
BASE = "https://api.github.com"

MAX_FILE_SIZE = 20_000

PRIORITY_FILES = [
    "README.md",
    "readme.md",
    "README.rst",
    "CONTRIBUTING.md",
    "package.json",
    "composer.json",
    "pyproject.toml",
    "requirements.txt",
    "setup.py",
    "Cargo.toml",
    "go.mod",
    "Gemfile",
    "pom.xml",
    "build.gradle",
]




async def _get(client: httpx.AsyncClient, url: str, params: dict = {}, ttl: float = 3600.0) -> dict | list:
    try:
        res = await cached_get(client, url, headers=HEADERS, params=params, ttl=ttl)
        res.raise_for_status()
        return res.json()
    except Exception:
        return {}



async def _fetch_file_by_name(client: httpx.AsyncClient, repo: str, filename: str) -> str:
    data = await _get(client, f"{BASE}/repos/{repo}/contents/{filename}", ttl=86400.0)
    if not data or "download_url" not in data:
        return ""
    try:
        res = await cached_get(client, data["download_url"], ttl=86400.0)
        return res.text[:MAX_FILE_SIZE]
    except Exception:
        return ""


async def fetch_readme(client: httpx.AsyncClient, repo: str) -> str:
    data = await _get(client, f"{BASE}/repos/{repo}/readme", ttl=86400.0)
    if not data or "download_url" not in data:
        return ""
    try:
        res = await cached_get(client, data["download_url"], ttl=86400.0)
        return res.text[:MAX_FILE_SIZE]
    except Exception:
        return ""


_CONTRIBUTING_CANDIDATES = [
    "CONTRIBUTING.md",
    "CONTRIBUTING.rst",
    "CONTRIBUTING.txt",
    ".github/CONTRIBUTING.md",
    "docs/CONTRIBUTING.md",
    "DEVELOPMENT.md",
    "docs/development.md",
    "HACKING.md",
]


async def fetch_contributing(client: httpx.AsyncClient, repo: str) -> str:
    for filename in _CONTRIBUTING_CANDIDATES:
        content = await _fetch_file_by_name(client, repo, filename)
        if content:
            return content
    return ""


async def fetch_repo_info(
    client: httpx.AsyncClient, repo: str
) -> tuple[int, str, str, str, list[str]]:
    data = await _get(client, f"{BASE}/repos/{repo}", ttl=3600.0)
    if not isinstance(data, dict):
        return 0, "", "", "", []
    stars = data.get("stargazers_count", 0)
    language = data.get("language") or ""
    license_name = (data.get("license") or {}).get("name", "")
    description = data.get("description") or ""
    topics = data.get("topics") or []
    return stars, language, license_name, description, topics


async def fetch_directory_contents_and_files(
    client: httpx.AsyncClient, repo: str
) -> tuple[list[str], dict[str, str]]:
    contents = await _get(client, f"{BASE}/repos/{repo}/contents", ttl=3600.0)
    if not isinstance(contents, list):
        return [], {}

    structure = []
    files_to_fetch = {}

    for item in contents:
        if not isinstance(item, dict):
            continue
        item_type = item.get("type", "file")
        name = item.get("name", "")
        structure.append(f"{'📁' if item_type == 'dir' else '📄'} {name}")

        # Check if it matches priority files (case-insensitive)
        if item_type == "file" and name.lower() in [f.lower() for f in PRIORITY_FILES]:
            download_url = item.get("download_url")
            if download_url:
                files_to_fetch[name] = download_url

    # Fetch matched priority files concurrently
    fetched_files = {}
    async def fetch_one(name: str, url: str):
        try:
            res = await cached_get(client, url, ttl=86400.0)
            # Truncate content to 8000 characters
            fetched_files[name] = res.text[:8000]
        except Exception:
            pass

    await asyncio.gather(*(fetch_one(name, url) for name, url in files_to_fetch.items()))
    return structure, fetched_files


def parse_github_repo_url(url: str) -> str:
    url = url.strip().rstrip("/")
    pattern = r"https?://github\.com/([^/]+/[^/]+)"
    match = re.match(pattern, url, re.IGNORECASE)
    if not match:
        raise ValueError("Invalid GitHub repository URL format. Must be like https://github.com/owner/repo")
    return match.group(1)


async def fetch_repo_details(repo: str) -> RepoDetails:
    async with httpx.AsyncClient(timeout=30.0) as client:
        (
            (stars, language, license_name, description, topics),
            (structure, files),
        ) = await asyncio.gather(
            fetch_repo_info(client, repo),
            fetch_directory_contents_and_files(client, repo),
        )

        # Determine readme
        readme = ""
        for name in ["README.md", "readme.md", "README.rst"]:
            if name in files:
                readme = files[name]
                break
        if not readme:
            readme = await fetch_readme(client, repo)

        # Determine contributing
        contributing = files.get("CONTRIBUTING.md", "")
        if not contributing:
            contributing = await fetch_contributing(client, repo)

        # De-duplicate: remove readme and contributing files from files dictionary
        for name in ["README.md", "readme.md", "README.rst", "CONTRIBUTING.md"]:
            files.pop(name, None)

    return RepoDetails(
        repo=repo,
        readme=readme,
        contributing=contributing,
        repo_stars=stars,
        repo_language=language,
        license=license_name,
        description=description,
        topics=topics,
        files=files,
        structure=structure,
    )


async def fetch_specific_file(repo: str, filepath: str) -> str | None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        content = await _fetch_file_by_name(client, repo, filepath)
        return content[:6000] if content else None

