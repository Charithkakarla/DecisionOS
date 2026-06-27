from typing import Any

def process_feedback(state_snapshot: dict[str, Any]) -> list[str]:
    """Extract explicit human feedback items from the approval artifact."""
    
    approval = state_snapshot.get("approval_artifact", {})
    payload = approval.get("payload", {})
    
    feedback_signals = []
    
    for item in payload.get("feedback_items", []):
        feedback_signals.append(f"Correction on {item.get('section')}: {item.get('comment')}")
        
    for mod in payload.get("modified_sections", []):
        feedback_signals.append(f"Modified {mod.get('section')}. Reason: {mod.get('change_reason')}")
        
    return feedback_signals
