import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { clear } from "idb-keyval";
import { newProject, listProjects, saveProject, deleteProject, getLastProjectId, setLastProjectId } from "./storage";
beforeEach(async () => { await clear(); });
describe("project storage", () => {
    it("saves and lists projects", async () => {
        const p = newProject("first");
        await saveProject(p);
        const all = await listProjects();
        expect(all.map((x) => x.name)).toEqual(["first"]);
    });
    it("updates an existing project in place", async () => {
        const p = newProject("first");
        await saveProject(p);
        await saveProject({ ...p, name: "renamed" });
        const all = await listProjects();
        expect(all).toHaveLength(1);
        expect(all[0].name).toBe("renamed");
    });
    it("deletes a project", async () => {
        const p = newProject("first");
        await saveProject(p);
        await deleteProject(p.id);
        expect(await listProjects()).toEqual([]);
    });
    it("tracks the last opened project id", async () => {
        await setLastProjectId("abc");
        expect(await getLastProjectId()).toBe("abc");
    });
});
