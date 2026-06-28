import os
import uuid
import datetime
import email
from email import policy
from pypdf import PdfReader
from fastapi import UploadFile

from app.agents.context.service import ContextService
from app.schemas.state import WorkflowState

# Base directory for transcript storage
STORAGE_BASE_DIR = os.path.join(os.getcwd(), "storage", "transcripts")

class TranscriptService:
    def __init__(self):
        self.context_service = ContextService()
        
    async def process_and_store(self, file: UploadFile) -> dict:
        # Extract text based on file extension
        ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        content = await file.read()
        
        text_content = ""
        if ext == 'eml':
            # Parse email using built-in library
            msg = email.message_from_bytes(content, policy=policy.default)
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition"))
                    if content_type == "text/plain" and "attachment" not in content_disposition:
                        body += part.get_payload(decode=True).decode()
            else:
                body = msg.get_payload(decode=True).decode()
            
            subject = msg.get("Subject", "No Subject")
            sender = msg.get("From", "Unknown Sender")
            text_content = f"From: {sender}\nSubject: {subject}\n\n{body}"
            
        elif ext == 'pdf':
            # Parse PDF
            import io
            reader = PdfReader(io.BytesIO(content))
            for page in reader.pages:
                text_content += page.extract_text() + "\n"
        else:
            # Assume txt or md
            text_content = content.decode('utf-8')
            
        if not text_content:
            raise ValueError("Could not extract text from file")
            
        return await self.store_and_process_text(text_content)

    async def store_and_process_text(self, text_content: str) -> dict:
        # Store date-wise
        today = datetime.datetime.now()
        date_path = os.path.join(STORAGE_BASE_DIR, str(today.year), f"{today.month:02d}", f"{today.day:02d}")
        os.makedirs(date_path, exist_ok=True)
        
        file_id = str(uuid.uuid4())
        save_path = os.path.join(date_path, f"{file_id}.txt")
        
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(text_content)
            
        # Extract structural data using Context Agent
        state = WorkflowState(
            workflow_id=f"wf-{file_id[:8]}",
            execution_id=f"exec-{file_id[:8]}",
            transcript=text_content
        )
        
        state = await self.context_service.execute(state)
        
        return {
            "status": "success",
            "file_id": file_id,
            "path": save_path,
            "extracted_context": state.context_artifact.payload if state.context_artifact else None
        }
