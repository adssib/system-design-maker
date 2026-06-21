import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";
import { Play, Square, LayoutGrid, Trash2, Search, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
import { useAppStore, appStore } from "./store";
import Canvas from "./canvas/Canvas";
import Editors from "./editor/Editors";
import { EXAMPLES, type Example } from "./examples";
import {
  newProject, listProjects, saveProject, deleteProject,
  getLastProjectId, setLastProjectId, examplesSeeded, markExamplesSeeded,
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
import FlowSelector from "@/components/FlowSelector";
import ShareButton from "@/components/ShareButton";
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const speed = useAppStore((s) => s.speed);
  const structureText = useAppStore((s) => s.structureText);
  const flowText = useAppStore((s) => s.flowText);
  const positions = useAppStore((s) => s.positions);
  const saveTimer = useRef(0);

  // boot
  useEffect(() => {
    (async () => {
      // seed the example projects once — also for users whose storage predates them
      if (!(await examplesSeeded())) {
        for (const ex of EXAMPLES) {
          await saveProject({ ...newProject(ex.name), structureText: ex.structureText, flowText: ex.flowText, isExample: true });
        }
        await markExamplesSeeded();
        toast("New here? Click the ? for a 30-second guide.", { duration: 6000 });
      }

      // protect example projects that were seeded before the isExample flag existed
      const exampleNames = new Set(EXAMPLES.map((e) => e.name));
      for (const p of await listProjects()) {
        if (!p.isExample && exampleNames.has(p.name)) await saveProject({ ...p, isExample: true });
      }

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
        active = all.find((p) => p.id === lastId) ?? all[0];
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
    setSidebarOpen(false);
    appStore.getState().load(p.structureText, p.flowText, p.positions);
    await setLastProjectId(p.id);
  };

  const play = () => { setSidebarOpen(false); appStore.getState().play(); };

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
    const target = projects.find((p) => p.id === id);
    if (target?.isExample) return; // seeded examples are protected
    const name = target?.name ?? "project";
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
          {/* mobile: open-sidebar button (hidden on md+) */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="absolute left-3 top-3 z-20 flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-lg md:hidden"
          >
            <Menu className="size-5" />
          </button>

          {/* mobile: backdrop when the drawer is open */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 bg-black/55 md:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          <aside
            className={cn(
              "flex h-full w-[360px] flex-col gap-3 border-r border-border bg-card p-3.5",
              "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[88vw] max-md:max-w-[360px] max-md:shadow-2xl",
              "max-md:transition-transform max-md:duration-200",
              sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-2 text-[15px] font-semibold">
                <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={20} height={20} />
                system-design-maker
              </h1>
              <div className="flex items-center gap-1.5">
                <ShareButton />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://github.com/adssib/system-design-maker"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View source on GitHub"
                      className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      <GithubIcon />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>View source on GitHub</TooltipContent>
                </Tooltip>
                <HelpDialog />
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close menu"
                  className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground md:hidden"
                >
                  <X className="size-4" />
                </button>
              </div>
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
              {currentId && projects.length > 1 && !projects.find((p) => p.id === currentId)?.isExample && (
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

            <FlowSelector />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={play}><Play /> Send request</Button>
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
