/**
 * workflowStore — localStorage cache for workflow states.
 *
 * Stores up to MAX_STORED workflows. On each new run the full WorkflowState
 * JSON is written. The history list is kept separately for fast listing.
 */

import type { WorkflowState } from "../types/agent";

const STATE_KEY_PREFIX = "dos_workflow_state_";
const INDEX_KEY        = "dos_workflow_index";
const MAX_STORED       = 20;

interface WorkflowIndexEntry {
  id: string;
  workflow_id: string;
  execution_id: string;
  timestamp: string;         // ISO
  business_goal: string;
  top_recommendation: string;
  trust_score: number;
  confidence: number;
  estimated_roi: number;
  selected_strategy: string;
  agents_completed: number;
  transcript_preview: string;
}

// ── Write ──────────────────────────────────────────────────────────────────────

export function saveWorkflowState(state: WorkflowState): void {
  try {
    const id = state.workflow_id ?? `local-${Date.now()}`;
    const dec   = state.decision_artifact?.payload;
    const strat = state.strategy_artifact?.payload;
    const ref   = state.reflection_artifact?.payload;
    const topRec = dec?.recommendations?.[0];

    // Persist full state
    localStorage.setItem(
      `${STATE_KEY_PREFIX}${id}`,
      JSON.stringify(state)
    );

    // Update index
    const index = loadIndex();
    const entry: WorkflowIndexEntry = {
      id,
      workflow_id:       state.workflow_id ?? id,
      execution_id:      state.execution_id ?? "",
      timestamp:         new Date().toISOString(),
      business_goal:     dec?.business_goal ?? "",
      top_recommendation: topRec?.title ?? "",
      trust_score:       ref?.overall_trust_score ?? 0,
      confidence:        topRec?.confidence ?? 0,
      estimated_roi:     strat?.estimated_roi ?? 0,
      selected_strategy: strat?.selected_strategy ?? "",
      agents_completed:  [
        state.context_artifact, state.knowledge_artifact, state.decision_artifact,
        state.strategy_artifact, state.reflection_artifact, state.approval_artifact,
        state.learning_artifact,
      ].filter(Boolean).length,
      transcript_preview: state.transcript.substring(0, 120),
    };

    // Prepend, deduplicate, cap
    const newIndex = [entry, ...index.filter(e => e.id !== id)].slice(0, MAX_STORED);
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));

    // Evict oldest if over cap
    if (newIndex.length === MAX_STORED) {
      const evicted = index[MAX_STORED - 1];
      if (evicted) localStorage.removeItem(`${STATE_KEY_PREFIX}${evicted.id}`);
    }
  } catch (e) {
    console.warn("workflowStore.saveWorkflowState failed:", e);
  }
}

// ── Read ───────────────────────────────────────────────────────────────────────

export function loadWorkflowState(id: string): WorkflowState | null {
  try {
    const raw = localStorage.getItem(`${STATE_KEY_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadIndex(): WorkflowIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteWorkflowState(id: string): void {
  localStorage.removeItem(`${STATE_KEY_PREFIX}${id}`);
  const index = loadIndex().filter(e => e.id !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function clearAllWorkflows(): void {
  loadIndex().forEach(e => localStorage.removeItem(`${STATE_KEY_PREFIX}${e.id}`));
  localStorage.removeItem(INDEX_KEY);
}

export type { WorkflowIndexEntry };
