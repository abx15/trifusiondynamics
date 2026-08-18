from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from ..services.llm_client import llm_client
from ..dependencies import verify_internal_secret

router = APIRouter(prefix="/internal/meeting-summary", tags=["meeting"], dependencies=[Depends(verify_internal_secret)])

class MeetingRequest(BaseModel):
    transcript: str

class MeetingResponse(BaseModel):
    summary: str
    actionItems: List[Dict[str, Any]]

@router.post("", response_model=MeetingResponse)
async def summarize_meeting(req: MeetingRequest):
    try:
        result = await llm_client.summarize_meeting(req.transcript)
        return MeetingResponse(
            summary=result.get("summary", ""),
            actionItems=result.get("actionItems", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
