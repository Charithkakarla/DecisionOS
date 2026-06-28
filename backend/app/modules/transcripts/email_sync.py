import os
import imaplib
import email
from email.header import decode_header
import logging

from app.modules.transcripts.service import TranscriptService

logger = logging.getLogger("decision_os.transcripts.email_sync")

class EmailSyncService:
    def __init__(self):
        self.host = os.environ.get("DECISION_OS_EMAIL_HOST", "imap.gmail.com")
        self.port = int(os.environ.get("DECISION_OS_EMAIL_PORT", "993"))
        self.user = os.environ.get("DECISION_OS_EMAIL_USER", "")
        self.password = os.environ.get("DECISION_OS_EMAIL_PASS", "")
        self.transcript_service = TranscriptService()

    async def sync_unread_emails(self) -> dict:
        if not self.user or not self.password:
            return {"status": "error", "message": "Email credentials not configured."}

        try:
            # Connect to IMAP server
            mail = imaplib.IMAP4_SSL(self.host, self.port)
            mail.login(self.user, self.password)
            mail.select("inbox")

            # Search for unread emails
            status, messages = mail.search(None, "UNSEEN")
            if status != "OK":
                return {"status": "error", "message": "Failed to search inbox."}

            email_ids = messages[0].split()
            processed_count = 0
            results = []

            for email_id in email_ids:
                status, msg_data = mail.fetch(email_id, "(RFC822)")
                if status != "OK":
                    continue
                
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        subject, encoding = decode_header(msg["Subject"])[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding if encoding else "utf-8")
                            
                        sender = msg.get("From")
                        
                        body = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                content_type = part.get_content_type()
                                content_disposition = str(part.get("Content-Disposition"))
                                if content_type == "text/plain" and "attachment" not in content_disposition:
                                    try:
                                        body += part.get_payload(decode=True).decode()
                                    except:
                                        pass
                        else:
                            try:
                                body = msg.get_payload(decode=True).decode()
                            except:
                                pass
                                
                        text_content = f"From: {sender}\nSubject: {subject}\n\n{body}"
                        
                        # Process and store
                        result = await self.transcript_service.store_and_process_text(text_content)
                        results.append(result)
                        processed_count += 1
                        
            mail.logout()
            return {
                "status": "success",
                "emails_processed": processed_count,
                "details": results
            }
            
        except Exception as e:
            logger.error(f"IMAP sync failed: {e}")
            return {"status": "error", "message": str(e)}
