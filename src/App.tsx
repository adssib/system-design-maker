import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useAppStore, appStore } from "./store";
import Canvas from "./canvas/Canvas";
import Editors from "./editor/Editors";
import { SEED } from "./seed";
import {
  newProject, listProjects, saveProject, deleteProject,
  getLastProjectId, setLastProjectId,
} from "./projects/storage";
import type { Project } from "./types";
import { decodeShare } from "./share/url";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const speed = useAppStore((s) => s.speed);
  const structureText = useAppStore((s) => s.structureText);
  const flowText = useAppStore((s) => s.flowText);
  const positions = useAppStore((s) => s.positions);
  const saveTimer = useRef(0);

  // boot
  useEffect(() => {
    (async () => {
      const shared = decodeShare(location.hash);
      let all = await listProjects();
      let active: Project;
      if (shared) {
        active = { ...newProject("Shared design"), ...shared };
        await saveProject(active);
        history.replaceState(null, "", location.pathname);
        all = await listProjects();
      } else {
        const lastId = await getLastProjectId();
        const found = all.find((p) => p.id === lastId);
        if (found) active = found;
        else if (all.length) active = all[0];
        else {
          active = { ...newProject("Example"), ...SEED };
          await saveProject(active);
          all = await listProjects();
        }
      }
      setProjects(all);
      setCurrentId(active.id);
      appStore.getState().load(active.structureText, active.flowText, active.positions);
      await setLastProjectId(active.id);
    })();
  }, []);

  // debounced autosave on any design change
  useEffect(() => {
    if (!currentId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const cur = projects.find((p) => p.id === currentId);
      if (!cur) return;
      const updated: Project = { ...cur, structureText, flowText, positions };
      await saveProject(updated);
      setProjects((ps) => ps.map((p) => (p.id === currentId ? updated : p)));
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [structureText, flowText, positions, currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTo = async (p: Project) => {
    setCurrentId(p.id);
    appStore.getState().load(p.structureText, p.flowText, p.positions);
    await setLastProjectId(p.id);
  };

  const createProject = async () => {
    const p = { ...newProject(`Project ${projects.length + 1}`), ...SEED };
    await saveProject(p);
    setProjects(await listProjects());
    await switchTo(p);
  };

  const removeProject = async (id: string) => {
    await deleteProject(id);
    const all = await listProjects();
    setProjects(all);
    if (id === currentId && all.length) await switchTo(all[0]);
  };

  return (
    <ReactFlowProvider>
      <div className="app">
        <aside className="sidebar">
          <h1>system-design-maker</h1>

          <div className="projects">
            <select value={currentId ?? ""} onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value);
              if (p) switchTo(p);
            }}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={createProject}>+ New</button>
            {currentId && projects.length > 1 && (
              <button onClick={() => removeProject(currentId)}>🗑</button>
            )}
          </div>

          <Editors />

          <div className="transport">
            <button className="primary" onClick={() => appStore.getState().play()}>▶ Send request</button>
            <button onClick={() => appStore.getState().stop()}>■ Stop</button>
            <button onClick={() => appStore.getState().autoArrange()}>⤢ Arrange</button>
          </div>
          <div className="row">
            <label>Speed</label>
            <input type="range" min={60} max={600} value={speed}
              onChange={(e) => appStore.getState().setSpeed(Number(e.target.value))} />
          </div>
        </aside>

        <Canvas />
      </div>
    </ReactFlowProvider>
  );
}
