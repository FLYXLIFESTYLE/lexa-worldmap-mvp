"""
Lightweight web crawler for intake (optional Crawl4AI integration).

We keep this intentionally simple:
- Domain-limited crawling (same host)
- Small page limits
- Text extraction suitable for downstream LLM extraction

If `crawl4ai` is installed, we use it to produce higher-quality Markdown.
Otherwise we fall back to `httpx` + a basic HTML-to-text cleaner.
"""

from __future__ import annotations

from typing import List, Dict, Optional, Tuple
import asyncio
import re
from urllib.parse import urlparse

import httpx
import structlog

logger = structlog.get_logger()


def html_to_text(html: str) -> Tuple[Optional[str], str]:
    """Extract <title> and a readable text body from HTML."""
    if not html:
        return None, ""
    m = re.search(r"<title[^>]*>([^<]+)</title>", html, flags=re.IGNORECASE)
    title = m.group(1).strip() if m else None

    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<noscript[\s\S]*?</noscript>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return title, text


async def fetch_page(url: str, timeout_s: float = 25.0) -> Dict[str, str]:
    """Fetch a single page and return {url,title,text}."""
    async with httpx.AsyncClient(timeout=timeout_s, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": "LEXA/1.0"})
        resp.raise_for_status()
        title, text = html_to_text(resp.text)
        return {"url": url, "title": title or "", "text": text}


async def crawl_pages(
    *,
    start_url: str,
    urls: List[str],
    max_pages: int = 5,
    max_concurrency: int = 3,
) -> List[Dict[str, str]]:
    """
    Crawl a set of URLs (already discovered), domain-limited to start_url host.
    Returns list of {url,title,text}.
    """
    base = urlparse(start_url)
    same_host = []
    for u in urls:
        try:
            p = urlparse(u)
            if p.scheme in ("http", "https") and p.hostname == base.hostname:
                same_host.append(u)
        except Exception:
            continue

    targets = same_host[: max(1, int(max_pages))]

    sem = asyncio.Semaphore(max(1, int(max_concurrency)))
    results: List[Dict[str, str]] = []

    async def _one(u: str):
        async with sem:
            try:
                results.append(await fetch_page(u))
            except Exception as e:
                logger.warning("Crawl fetch failed", url=u, error=str(e))

    await asyncio.gather(*[_one(u) for u in targets])
    return results


async def crawl_with_crawl4ai(
    *,
    urls: List[str],
    max_pages: int = 5,
) -> Optional[List[Dict[str, str]]]:
    """
    If Crawl4AI is installed, fetch and return Markdown-like text for each URL.
    Returns None if crawl4ai isn't available.
    """
    try:
        from crawl4ai import AsyncWebCrawler  # type: ignore
    except Exception:
        return None

    out: List[Dict[str, str]] = []
    use_urls = urls[: max(1, int(max_pages))]
    async with AsyncWebCrawler() as crawler:
        for u in use_urls:
            try:
                res = await crawler.arun(u)
                markdown = getattr(res, "markdown", None)
                md_text = ""
                if markdown is not None:
                    md_text = getattr(markdown, "raw_markdown", "") or str(markdown)
                out.append({"url": u, "title": "", "text": (md_text or "").strip()})
            except Exception as e:
                logger.warning("Crawl4AI failed", url=u, error=str(e))
    return out


async def crawl_and_combine_text(
    *,
    start_url: str,
    discovered_urls: List[str],
    max_pages: int = 5,
) -> str:
    """
    Crawl discovered URLs and combine into a single text payload suitable for extraction.
    """
    # Try Crawl4AI first if present (better extraction), then fallback.
    crawl4ai_rows = await crawl_with_crawl4ai(urls=discovered_urls, max_pages=max_pages)
    rows = crawl4ai_rows
    if rows is None:
        rows = await crawl_pages(start_url=start_url, urls=discovered_urls, max_pages=max_pages)

    parts: List[str] = []
    for r in rows:
        url = r.get("url", "")
        title = r.get("title", "")
        text = r.get("text", "")
        if not text:
            continue
        header = f"URL: {url}"
        if title:
            header = f"{header}\nTITLE: {title}"
        parts.append(header)
        parts.append(text)
        parts.append("\n---\n")
    return "\n".join(parts).strip()


