"""
Web Scraper Service
Extracts content from URLs and discovers subpages
"""

import httpx
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse
import asyncio


class WebScraper:
    """Web scraping service for URL content extraction"""
    
    def __init__(self):
        self.timeout = 30.0
        self.max_subpages = 50
        self.max_pages_default = 25
        # Many sites return empty/blocked content to default http clients.
        # Use a conservative, browser-like User-Agent everywhere.
        self._default_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        # Heuristic keywords to prioritize relevant pages when crawling sitemaps
        self._preferred_path_keywords = [
            "experience",
            "experiences",
            "itinerary",
            "itineraries",
            "tailored",
            "private",
            "guide",
            "guides",
            "tour",
            "tours",
            "service",
            "services",
            "destination",
            "destinations",
            "offer",
            "offering",
            "about",
        ]
    
    async def scrape_url(self, url: str, extract_subpages: bool = True) -> Dict:
        """
        Scrape a URL and extract content
        
        Args:
            url: URL to scrape
            extract_subpages: Whether to discover and extract subpage URLs
        
        Returns:
            Dict with content, metadata, and optional subpages
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self._default_headers)
                response.raise_for_status()
                
                # Parse HTML
                soup = BeautifulSoup(response.text, 'lxml')
                
                # Extract content
                content = self._extract_text_content(soup)
                metadata = self._extract_metadata(soup, url)
                
                result = {
                    "url": url,
                    "status_code": response.status_code,
                    "content": content,
                    "metadata": metadata,
                    "word_count": len(content.split()),
                }
                
                # Extract subpages if requested
                if extract_subpages:
                    subpages = self._extract_subpage_urls(soup, url)
                    result["subpages"] = subpages[:self.max_subpages]
                    result["subpage_count"] = len(subpages)
                
                return result
                
        except httpx.HTTPError as e:
            raise ValueError(f"Failed to scrape URL: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error processing URL: {str(e)}")
    
    def _extract_text_content(self, soup: BeautifulSoup) -> str:
        """Extract main text content from HTML"""
        
        # Remove script and style elements
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
        
        # Get text
        text = soup.get_text(separator='\n', strip=True)
        
        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        content = '\n'.join(lines)
        
        return content
    
    def _extract_metadata(self, soup: BeautifulSoup, url: str) -> Dict:
        """Extract metadata from HTML"""
        
        metadata = {
            "url": url,
            "domain": urlparse(url).netloc
        }
        
        # Title
        if soup.title:
            metadata["title"] = soup.title.string.strip()
        
        # Meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            metadata["description"] = meta_desc["content"].strip()
        
        # OG tags
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            metadata["og_title"] = og_title["content"].strip()
        
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            metadata["og_description"] = og_desc["content"].strip()
        
        # Keywords
        meta_keywords = soup.find("meta", attrs={"name": "keywords"})
        if meta_keywords and meta_keywords.get("content"):
            metadata["keywords"] = meta_keywords["content"].strip()
        
        return metadata
    
    def _extract_subpage_urls(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Extract all internal links from the page"""
        
        base_domain = urlparse(base_url).netloc
        subpages = set()
        
        # Find all links
        for link in soup.find_all('a', href=True):
            href = link['href']
            
            # Convert relative URLs to absolute
            absolute_url = urljoin(base_url, href)
            
            # Only include links from same domain
            if urlparse(absolute_url).netloc == base_domain:
                # Remove fragments and query params for cleaner URLs
                clean_url = absolute_url.split('#')[0].split('?')[0]
                if clean_url and clean_url != base_url:
                    subpages.add(clean_url)
        
        return sorted(list(subpages))

    async def _fetch_sitemap_urls(self, base_url: str) -> List[str]:
        """
        Best-effort: fetch WordPress sitemap (wp-sitemap.xml) or generic sitemap.xml and return URLs.
        This helps when the entry page doesn't link out to important subpages (common on marketing sites).
        """
        parsed = urlparse(base_url)
        root = f"{parsed.scheme}://{parsed.netloc}"
        candidates = [f"{root}/wp-sitemap.xml", f"{root}/sitemap.xml"]

        urls: List[str] = []

        async def _fetch_one_sitemap(client: httpx.AsyncClient, sitemap_url: str) -> List[str]:
            try:
                r = await client.get(sitemap_url, headers=self._default_headers)
                if r.status_code != 200 or not r.text:
                    return []
                soup = BeautifulSoup(r.text, "xml")
                locs = [loc.get_text(strip=True) for loc in soup.find_all("loc")]
                out: List[str] = []
                for u in locs:
                    try:
                        u_parsed = urlparse(u)
                        if u_parsed.netloc != parsed.netloc:
                            continue
                        clean = u.split("#")[0].split("?")[0]
                        if clean:
                            out.append(clean)
                    except Exception:
                        continue
                return out
            except Exception:
                return []

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            for sm in candidates:
                locs = await _fetch_one_sitemap(client, sm)
                if not locs:
                    continue

                # WordPress often returns a sitemap index (locs ending with .xml).
                # If so, follow a limited number of sub-sitemaps to get real page URLs.
                xml_locs = [u for u in locs if u.lower().endswith(".xml")]
                non_xml_locs = [u for u in locs if not u.lower().endswith(".xml")]

                collected: List[str] = []
                collected.extend(non_xml_locs)

                if xml_locs and not non_xml_locs:
                    # Treat as sitemap index
                    seen_sitemaps = set()
                    # Limit: don't crawl huge sites accidentally
                    for sub_sm in xml_locs[:8]:
                        if sub_sm in seen_sitemaps:
                            continue
                        seen_sitemaps.add(sub_sm)
                        sub_locs = await _fetch_one_sitemap(client, sub_sm)
                        # Keep only non-xml entries (real pages)
                        for u in sub_locs:
                            if u.lower().endswith(".xml"):
                                continue
                            collected.append(u)
                        if len(collected) >= 800:
                            break

                if collected:
                    urls.extend(collected)
                    break

        # De-dupe while preserving order
        seen = set()
        unique: List[str] = []
        for u in urls:
            if u in seen:
                continue
            seen.add(u)
            unique.append(u)
        return unique

    def _rank_urls(self, urls: List[str]) -> List[str]:
        """
        Prefer URLs that look like content pages (experience offerings etc.).
        """
        def score(u: str) -> int:
            path = (urlparse(u).path or "").lower()
            s = 0
            for kw in self._preferred_path_keywords:
                if kw in path:
                    s += 2
            # Prefer deeper paths over home/root
            s += min(len([p for p in path.split("/") if p]), 6)
            return s

        return sorted(urls, key=score, reverse=True)

    async def scrape_url_with_subpages_content(
        self,
        url: str,
        max_pages: int | None = None,
    ) -> Dict:
        """
        Scrape a URL and ALSO fetch content from discovered subpages.
        This is used for provider pages where details live across sub-pages.
        """
        max_pages = max_pages or self.max_pages_default
        base = await self.scrape_url(url, extract_subpages=True)

        # Discover subpages from on-page links
        subpages: List[str] = base.get("subpages", []) or []

        # If the entry page doesn't expose many links, also use sitemap URLs as a fallback.
        sitemap_urls: List[str] = []
        try:
            sitemap_urls = await self._fetch_sitemap_urls(url)
        except Exception:
            sitemap_urls = []

        # Merge and rank
        merged = list(dict.fromkeys([*subpages, *sitemap_urls]))  # preserve order, unique
        merged = [u for u in merged if isinstance(u, str) and u]  # safety
        merged_ranked = self._rank_urls(merged)

        # Keep room for root page
        subpages = merged_ranked[: max_pages - 1]

        pages: List[Dict[str, str]] = [{"url": url, "content": base.get("content", "")}]

        async def _fetch_one(u: str) -> Optional[Dict[str, str]]:
            try:
                async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                    r = await client.get(u, headers=self._default_headers)
                    r.raise_for_status()
                    soup = BeautifulSoup(r.text, "lxml")
                    content = self._extract_text_content(soup)
                    return {"url": u, "content": content}
            except Exception:
                return None

        # Fetch concurrently (but keep it simple)
        tasks = [_fetch_one(u) for u in subpages]
        results = await asyncio.gather(*tasks)
        for item in results:
            if item and item.get("content"):
                pages.append(item)

        # Build combined content with clear boundaries for citations/debugging
        combined = []
        for p in pages:
            combined.append(f"\n\n--- PAGE: {p['url']} ---\n{p['content']}")
        combined_text = "\n".join(combined).strip()

        return {
            "url": url,
            "subpages": subpages,
            "subpage_count": len(subpages),
            "pages_fetched": len(pages),
            "content": combined_text,
            "metadata": {
                **(base.get("metadata", {}) or {}),
                "sitemap_used": bool(sitemap_urls),
                "sitemap_url_count": len(sitemap_urls),
            },
            "word_count": len(combined_text.split()),
        }


# Global instance
web_scraper = WebScraper()
