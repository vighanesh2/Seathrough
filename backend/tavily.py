"""
Tavily web search for the Python tutor backend.

Uses TAVILY_API_KEY from .env (loaded by Misconception.load_env).
Never prints the key.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any
from urllib.parse import urlparse

import Misconception as misconception

SEARCH_URL = "https://api.tavily.com/search"
USER_AGENT = "SeethroughBackend/1.0"
TIMEOUT_SEC = 12
MAX_RESULTS = 5

BLOCKED = (
    "reddit.com",
    "quora.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "x.com",
    "twitter.com",
    "pinterest.com",
    "fandom.com",
)


def _hostname(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
    except ValueError:
        return ""
    host = host.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _blocked(url: str) -> bool:
    host = _hostname(url)
    if not host:
        return True
    return any(host == d or host.endswith("." + d) for d in BLOCKED)


def _normalize(payload: dict[str, Any]) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for raw in payload.get("results") or []:
        if not isinstance(raw, dict):
            continue
        url = str(raw.get("url") or "").strip()
        title = " ".join(str(raw.get("title") or "").split())[:180]
        excerpt = " ".join(str(raw.get("content") or "").split())[:700]
        if not url.startswith("http") or not title or not excerpt:
            continue
        if _blocked(url) or url in seen:
            continue
        seen.add(url)
        out.append(
            {
                "id": f"S{len(out) + 1}",
                "title": title,
                "url": url,
                "publisher": _hostname(url),
                "excerpt": excerpt,
            }
        )
        if len(out) >= MAX_RESULTS:
            break
    answer = " ".join(str(payload.get("answer") or "").split())[:900]
    if answer:
        out.insert(
            0,
            {
                "id": "A1",
                "title": "Tavily summary",
                "url": "",
                "publisher": "tavily",
                "excerpt": answer,
            },
        )
    return out


def search(query: str, *, max_results: int = 8) -> list[dict[str, str]]:
    key = misconception.env_value("TAVILY_API_KEY")
    trimmed = " ".join((query or "").split())[:400]
    if not key or not trimmed:
        return []
    body = json.dumps(
        {
            "query": trimmed,
            "topic": "general",
            "search_depth": "basic",
            "max_results": max(3, min(12, max_results)),
            "include_answer": True,
            "include_raw_content": False,
            "include_images": False,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        SEARCH_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SEC) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError):
        return []
    if not isinstance(payload, dict):
        return []
    return _normalize(payload)


def format_evidence(sources: list[dict[str, str]]) -> str:
    if not sources:
        return ""
    blocks = []
    for src in sources:
        line = f"[{src['id']}] {src['title']}"
        if src.get("publisher"):
            line += f" ({src['publisher']})"
        if src.get("url"):
            line += f"\nURL: {src['url']}"
        line += f"\nExcerpt: {src['excerpt']}"
        blocks.append(line)
    return "\n\n".join(blocks)
