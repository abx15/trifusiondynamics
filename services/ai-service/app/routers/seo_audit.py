from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from ..services.llm_client import llm_client
from ..services.website_scraper import scrape_website
from ..dependencies import verify_internal_secret

router = APIRouter(prefix="/internal/seo-audit", tags=["seo"], dependencies=[Depends(verify_internal_secret)])

class SeoAuditRequest(BaseModel):
    websiteUrl: str

class SeoAuditResponse(BaseModel):
    score: int
    findings: Dict[str, Any]
    recommendations: List[Dict[str, Any]]

@router.post("", response_model=SeoAuditResponse)
async def audit_website(req: SeoAuditRequest):
    try:
        scraped_data = await scrape_website(req.websiteUrl)
        result = await llm_client.audit_website(scraped_data)
        return SeoAuditResponse(
            score=result.get("score", 0),
            findings=result.get("findings", {}),
            recommendations=result.get("recommendations", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
