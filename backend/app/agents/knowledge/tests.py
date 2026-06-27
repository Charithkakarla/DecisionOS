# Contains: tests.py implementation.
import pytest
import uuid
from app.agents.knowledge.ingest import extract_text
from app.agents.knowledge.chunking import chunk_text, chunk_document_sections
from app.agents.knowledge.providers.mock import MockEmbeddingProvider
from app.agents.knowledge.embeddings import EmbeddingService
from app.agents.knowledge.evidence_collector import collect_evidence
from app.schemas.state import WorkflowState, EvidencePackage

# Sample mock text for doc ingest
sample_txt_content = b"This is a sample playbook document. Section 1 is about discovery. Section 2 is about closure."

def test_chunk_text():
    text = "abcdefghij"
    # size 5, overlap 2
    # chunk 1: abcde
    # next start: 5 - 2 = 3 (defgh)
    # next start: 3 + 3 = 6 (ghij)
    chunks = chunk_text(text, chunk_size=5, chunk_overlap=2)
    assert len(chunks) > 0
    assert chunks[0] == "abcde"

def test_extract_text_txt():
    res = extract_text(sample_txt_content, "playbook.txt")
    assert len(res) == 1
    assert res[0]["section"] == "Main Content"
    assert "playbook document" in res[0]["content"]

@pytest.mark.asyncio
async def test_mock_embedding_provider():
    provider = MockEmbeddingProvider(dimension=768)
    q_vec = await provider.embed_query("test query")
    assert len(q_vec) == 768
    # Test normalization (magnitude should be 1.0)
    mag = sum(x*x for x in q_vec) ** 0.5
    assert pytest.approx(mag, 0.001) == 1.0

def test_collect_evidence():
    from types import SimpleNamespace
    mock_chunk = SimpleNamespace(
        id=uuid.uuid4(),
        content="Test content chunk",
        page=2,
        section="Discovery Phase"
    )
    mock_doc = SimpleNamespace(
        id=uuid.uuid4(),
        name="Technical Playbook.pdf",
        mime_type="application/pdf",
        version="1.0",
        department="Sales"
    )
    
    results = [{
        "chunk": mock_chunk,
        "doc": mock_doc,
        "similarity_score": 0.85
    }]
    
    package = collect_evidence(results)
    assert len(package.knowledge_results) == 1
    assert package.confidence_score == 0.85
    assert package.citations[0] == "Technical Playbook.pdf • Page 2 • Discovery Phase"
    assert package.evidence_metadata[0]["department"] == "Sales"
