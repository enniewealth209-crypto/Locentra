"""
Thin wrapper that loads CountryLogic from the project root.
Keeps the Django app free of duplicated code.
"""
import sys
from pathlib import Path

# project root (two levels up from this file)
ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from logic import CountryLogic  # noqa: E402 — intentional late import

# Single instance shared across all requests
_logic: CountryLogic | None = None


def get_logic() -> CountryLogic:
    global _logic
    if _logic is None:
        _logic = CountryLogic()
    return _logic
