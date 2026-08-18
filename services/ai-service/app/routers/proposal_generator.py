from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..services.llm_client import llm_client
from ..dependencies import verify_internal_secret

router = APIRouter(prefix="/internal/proposal-generator", tags=["proposal"], dependencies=[Depends(verify_internal_secret)])

class ProposalRequest(BaseModel):
    requirements: str

class ProposalResponse(BaseModel):
    generatedContent: str

@router.post("", response_model=ProposalResponse)
async def generate_proposal(req: ProposalRequest):
    try:
        content = await llm_client.generate_proposal(req.requirements)
        return ProposalResponse(generatedContent=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
