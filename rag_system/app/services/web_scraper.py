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
                response = await client.get(url)
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

        subpages: List[str] = base.get("subpages", []) or []
        subpages = subpages[: max_pages - 1]  # keep room for root page

        pages: List[Dict[str, str]] = [{"url": url, "content": base.get("content", "")}]

        async def _fetch_one(u: str) -> Optional[Dict[str, str]]:
            try:
                async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                    r = await client.get(u)
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
            "metadata": base.get("metadata", {}),
            "word_count": len(combined_text.split()),
        }


# Global instance
web_scraper = WebScraper()
