import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";
import { Play, Square, LayoutGrid, Trash2, Search } from "lucide-react";
import { useAppStore, appStore } from "./store";
import Canvas from "./canvas/Canvas";
import Editors from "./editor/Editors";
import { EXAMPLES, type Example } from "./examples";
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
import AddComponent from "@/components/AddComponent";
import NewProjectMenu from "@/components/NewProjectMenu";
import HelpDialog from "@/components/HelpDialog";

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
          // first run: seed the example templates
          for (const ex of EXAMPLES) {
            await saveProject({ ...newProject(ex.name), structureText: ex.structureText, flowText: ex.flowText });
          }
          all = await listProjects();
          active = all[0];
          toast("New here? Click the ? for a 30-second guide.", { duration: 6000 });
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

  const createProject = async (tpl?: Example) => {
    const base = newProject(tpl?.name ?? `Project ${projects.length + 1}`);
    const p: Project = tpl
      ? { ...base, structureText: tpl.structureText, flowText: tpl.flowText }
      : base;
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
                <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={20} height={20} />
                system-design-maker
              </h1>
              <HelpDialog />
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
              <NewProjectMenu onCreate={createProject} />
              {currentId && projects.length > 1 && (
                <IconButton label="Delete project" variant="ghost" onClick={() => removeProject(currentId)}>
                  <Trash2 />
                </IconButton>
              )}
            </div>

            <div className="flex gap-2">
              <AddComponent />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Search / command palette"
                    onClick={() => appStore.getState().setPaletteOpen(true)}
                  >
                    <Search />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search components &amp; commands (⌘K)</TooltipContent>
              </Tooltip>
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
