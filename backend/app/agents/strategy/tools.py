# Contains: tools.py implementation.
def compose_draft(playbooks: list[str]) -> str:
    return (
        "Recommended approach: run an alignment workshop, validate constraints, "
        "and execute a scoped pilot using playbooks: " + ", ".join(playbooks)
    )
