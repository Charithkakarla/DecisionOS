# Contains: ingest.py implementation.
from io import BytesIO
import logging
from pypdf import PdfReader
from docx import Document

logger = logging.getLogger("decision_os.knowledge.ingest")

def extract_text_from_pdf(content: bytes) -> list[dict]:
    results = []
    try:
        reader = PdfReader(BytesIO(content))
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                results.append({
                    "content": page_text,
                    "page": page_idx + 1,
                    "section": f"Page {page_idx + 1}"
                })
    except Exception as e:
        logger.error(f"Error during PDF text extraction: {e}")
        raise ValueError(f"Failed to parse PDF document: {e}")
    return results

def extract_text_from_docx(content: bytes) -> list[dict]:
    results = []
    try:
        doc = Document(BytesIO(content))
        current_section = "Intro"
        paragraph_text_block = []
        
        for p in doc.paragraphs:
            # Simple section boundary check
            if p.style.name.startswith("Heading"):
                # Save previous block if it has text
                if paragraph_text_block:
                    results.append({
                        "content": "\n".join(paragraph_text_block),
                        "page": 1,
                        "section": current_section
                    })
                    paragraph_text_block = []
                current_section = p.text
            elif p.text and p.text.strip():
                paragraph_text_block.append(p.text)
                
        if paragraph_text_block:
            results.append({
                "content": "\n".join(paragraph_text_block),
                "page": 1,
                "section": current_section
            })
    except Exception as e:
        logger.error(f"Error during DOCX text extraction: {e}")
        raise ValueError(f"Failed to parse DOCX document: {e}")
    return results

def extract_text_from_txt(content: bytes) -> list[dict]:
    try:
        text = content.decode("utf-8", errors="ignore")
        return [{
            "content": text,
            "page": 1,
            "section": "Main Content"
        }]
    except Exception as e:
        logger.error(f"Error during TXT text extraction: {e}")
        raise ValueError(f"Failed to parse TXT document: {e}")

def extract_text(content: bytes, filename: str) -> list[dict]:
    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        return extract_text_from_pdf(content)
    elif ext == "docx":
        return extract_text_from_docx(content)
    elif ext == "txt":
        return extract_text_from_txt(content)
    else:
        raise ValueError(f"Unsupported file format: .{ext}")
