// Which Codex model the tutor runs on, how hard it thinks, and whether it uses the fast tier.
import { useSyncExternalStore } from "react";
import { useResource } from "./data.ts";

export type ModelInfo = { id: string; name: string; description: string; isDefault: boolean; efforts: string[]; fast: string | null };
/** null means "the app's default" (set on the server). */
export type AgentSettings = { model: string | null; effort: string | null; fast: boolean };

const KEY = "agentSettings";
const DEFAULTS: AgentSettings = { model: null, effort: null, fast: false };
const listeners = new Set<() => void>();

function read(): AgentSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

let current = read();

export function getAgentSettings() {
  return current;
}

export function setAgentSettings(patch: Partial<AgentSettings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  listeners.forEach((l) => l());
}

export function useAgentSettings() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  );
}

export const useModels = () => useResource<{ models: ModelInfo[]; defaultEffort: string }>("/api/models");

export const EFFORT_LABELS: Record<string, string> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Max",
  ultra: "Ultra",
};
