# Contains: tools.py implementation.
def is_deadline_present(text: str) -> bool:
    return "deadline" in text.lower()
