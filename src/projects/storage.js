import { get, set } from "idb-keyval";
const KEY = "sdm:projects";
const LAST = "sdm:last";
export function newProject(name = "Untitled") {
    return {
        id: (globalThis.crypto?.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`),
        name,
        structureText: "",
        flowText: "",
        positions: {},
        updatedAt: Date.now(),
    };
}
export async function listProjects() {
    return (await get(KEY)) ?? [];
}
export async function saveProject(p) {
    const all = await listProjects();
    const idx = all.findIndex((x) => x.id === p.id);
    const next = { ...p, updatedAt: Date.now() };
    if (idx >= 0)
        all[idx] = next;
    else
        all.push(next);
    await set(KEY, all);
}
export async function deleteProject(id) {
    const all = await listProjects();
    await set(KEY, all.filter((x) => x.id !== id));
}
export async function getLastProjectId() {
    return (await get(LAST)) ?? null;
}
export async function setLastProjectId(id) {
    await set(LAST, id);
}
