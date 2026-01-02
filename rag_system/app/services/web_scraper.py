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


# Global instance
web_scraper = WebScraper()
