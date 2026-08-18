import httpx
from bs4 import BeautifulSoup

async def scrape_website(url: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Simple extraction
        title = soup.title.string if soup.title else ""
        meta_desc = ""
        desc_tag = soup.find('meta', attrs={'name': 'description'})
        if desc_tag:
            meta_desc = desc_tag.get('content', '')
            
        h1_tags = [h1.text.strip() for h1 in soup.find_all('h1')]
        
        return {
            "title": title,
            "meta_description": meta_desc,
            "h1_count": len(h1_tags),
            "h1_tags": h1_tags,
            "text_content": soup.get_text(separator=' ', strip=True)[:2000] # limited for LLM
        }
    except Exception as e:
        raise Exception(f"Failed to scrape website: {str(e)}")
