from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Any
import logging

from app.modules.transcripts.service import TranscriptService
from app.modules.transcripts.email_sync import EmailSyncService

logger = logging.getLogger("decision_os.transcripts.router")
router = APIRouter(prefix="/api/v1/transcripts", tags=["transcripts"])
transcript_service = TranscriptService()
email_sync_service = EmailSyncService()

@router.post("/upload")
async def upload_transcript(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Upload an email (.eml), pdf (.pdf), or text file to extract context and save date-wise.
    """
    try:
        result = await transcript_service.process_and_store(file)
        return result
    except Exception as e:
        logger.error(f"Failed to process transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-emails")
async def sync_emails() -> dict[str, Any]:
    """
    Connect to IMAP and fetch/process unread emails.
    """
    try:
        result = await email_sync_service.sync_unread_emails()
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))
        return result
    except Exception as e:
        logger.error(f"Failed to sync emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))
