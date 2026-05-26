import sqlite3
import json
import os
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent / ".cache"
DB_PATH = DB_DIR / "sessions.db"

def init_db():
    """Ensure cache folder exists and initialize SQLite sessions table."""
    os.makedirs(DB_DIR, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                session_data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    try:
        from utils.vector_db import init_vector_db
        init_vector_db()
    except ImportError:
        pass

def save_session(session_id: str, state: dict) -> None:
    """Serialize the session state to JSON and write to SQLite."""
    serialized = json.dumps(state)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO sessions (session_id, session_data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (session_id, serialized)
        )
        conn.commit()

def get_session(session_id: str) -> dict | None:
    """Retrieve and deserialize a session state by ID from SQLite."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT session_data FROM sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        if row:
            try:
                return json.loads(row[0])
            except json.JSONDecodeError:
                return None
    return None

def delete_session(session_id: str) -> None:
    """Delete a session from SQLite."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM code_chunks WHERE session_id = ?", (session_id,))
        conn.commit()

def get_sessions_count() -> int:
    """Get the total count of active sessions stored in SQLite."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT COUNT(*) FROM sessions")
        row = cursor.fetchone()
        return row[0] if row else 0
