import { get, set } from "idb-keyval";
import type { Project } from "../types";

const KEY = "sdm:projects";
const LAST = "sdm:last";

export function newProject(name = "Untitled"): Project {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    name,
    structureText: "",
    flowText: "",
    positions: {},
    updatedAt: Date.now(),
  };
}

export async function listProjects(): Promise<Project[]> {
  return (await get<Project[]>(KEY)) ?? [];
}

export async function saveProject(p: Project): Promise<void> {
  const all = await listProjects();
  const idx = all.findIndex((x) => x.id === p.id);
  const next = { ...p, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = next; else all.push(next);
  await set(KEY, all);
}

export async function deleteProject(id: string): Promise<void> {
  const all = await listProjects();
  await set(KEY, all.filter((x) => x.id !== id));
}

export async function examplesSeeded(): Promise<boolean> {
  return (await get<boolean>("sdm:seeded")) ?? false;
}

export async function markExamplesSeeded(): Promise<void> {
  await set("sdm:seeded", true);
}

export async function getLastProjectId(): Promise<string | null> {
  return (await get<string>(LAST)) ?? null;
}

export async function setLastProjectId(id: string): Promise<void> {
  await set(LAST, id);
}
