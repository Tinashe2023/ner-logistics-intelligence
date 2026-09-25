"""
Database connection setup. Defaults to a local SQLite file so there's
zero setup for development — swap DATABASE_URL for a real Postgres
connection string at deploy time (e.g. Render's Postgres add-on) without
changing any other code, since SQLAlchemy abstracts the difference.

Note: the PHP admin panel (Week 3) will read/write this same database —
locally via SQLite's file, in production via the same Postgres instance.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
DEFAULT_SQLITE_PATH = os.path.join(DATA_DIR, "app.db")

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
