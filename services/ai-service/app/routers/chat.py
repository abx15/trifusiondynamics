from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Any
import logging
from ..services.llm_client import llm_client
from ..dependencies import verify_internal_secret

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/chat", tags=["chat"], dependencies=[Depends(verify_internal_secret)])

class ChatRequest(BaseModel):
    message: str
    conversationHistory: List[Any] = []

class ChatResponse(BaseModel):
    reply: str

@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        reply = await llm_client.chat(req.message, req.conversationHistory)
        return ChatResponse(reply=reply)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Chat request failed")
        raise HTTPException(status_code=500, detail="Internal server error")
