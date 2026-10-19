"""Vercel entry point for the Flask API."""

import sys
from pathlib import Path

# Vercel executes this file from the function directory; expose backend modules.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from wsgi import app  # noqa: E402

