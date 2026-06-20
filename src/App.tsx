import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";
import { Play, Square, LayoutGrid, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import RenameDialog from "@/components/RenameDialog";
import CommandPalette from "@/components/CommandPalette";

function IconButton({ label, onClick, children, variant = "secondary" }: {
  label: string; onClick: () => void; children: React.ReactNode;
  variant?: "secondary" | "ghost" | "destructive";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon" aria-label={label} onClick={onClick}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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
        toast.success("Imported shared design");
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
    toast.success(`Created "${p.name}"`);
  };

  const removeProject = async (id: string) => {
    const name = projects.find((p) => p.id === id)?.name ?? "project";
    await deleteProject(id);
    const all = await listProjects();
    setProjects(all);
    if (id === currentId && all.length) await switchTo(all[0]);
    toast(`Deleted "${name}"`);
  };

  return (
    <TooltipProvider delayDuration={250}>
      <ReactFlowProvider>
        <div className="app">
          <aside className="flex h-full w-[360px] flex-col gap-3 border-r border-border bg-card p-3.5">
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-2 text-[15px] font-semibold">
                <span className="size-2.5 rounded-full bg-primary shadow-[0_0_10px] shadow-primary" />
                system-design-maker
              </h1>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
            </div>

            <div className="flex gap-2">
              <Select value={currentId ?? ""} onValueChange={(id) => {
                const p = projects.find((x) => x.id === id);
                if (p) switchTo(p);
              }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <IconButton label="New project" onClick={createProject}><Plus /></IconButton>
              {currentId && projects.length > 1 && (
                <IconButton label="Delete project" variant="ghost" onClick={() => removeProject(currentId)}>
                  <Trash2 />
                </IconButton>
              )}
            </div>

            <Editors />

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => appStore.getState().play()}><Play /> Send request</Button>
              <IconButton label="Stop" onClick={() => appStore.getState().stop()}><Square /></IconButton>
              <IconButton label="Auto-arrange" onClick={() => appStore.getState().autoArrange()}><LayoutGrid /></IconButton>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Speed</span>
              <input
                type="range" min={60} max={600} value={speed}
                onChange={(e) => appStore.getState().setSpeed(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </div>
          </aside>

          <Canvas />
        </div>

        <CommandPalette onNewProject={createProject} />
        <RenameDialog />
        <Toaster />
      </ReactFlowProvider>
    </TooltipProvider>
  );
}
