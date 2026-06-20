import { useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Play, Square, LayoutGrid, FilePlus2, Box } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { COMPONENTS, iconFor } from "@/catalog";
import { typeOf } from "@/engine/typeInference";
import { useAppStore, appStore } from "@/store";

export default function CommandPalette({ onNewProject }: { onNewProject: () => void }) {
  const [open, setOpen] = useState(false);
  const nodes = useAppStore((s) => s.structure.nodes);
  const positions = useAppStore((s) => s.positions);
  const { setCenter, screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => { setOpen(false); fn(); };

  const insert = (id: string) => {
    const p = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    appStore.getState().select(appStore.getState().addNode(p.x - 75, p.y - 26, id));
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Run a command, add a component, jump to a node…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => appStore.getState().play())}><Play /> Send request</CommandItem>
          <CommandItem onSelect={() => run(() => appStore.getState().stop())}><Square /> Stop</CommandItem>
          <CommandItem onSelect={() => run(() => appStore.getState().autoArrange())}><LayoutGrid /> Auto-arrange</CommandItem>
          <CommandItem onSelect={() => run(onNewProject)}><FilePlus2 /> New project</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Add component">
          {COMPONENTS.map((c) => {
            const icon = iconFor(c.id, typeOf(c.id));
            return (
              <CommandItem
                key={c.id}
                value={`add ${c.label} ${c.id} ${(c.aliases ?? []).join(" ")}`}
                onSelect={() => run(() => insert(c.id))}
              >
                {icon.kind === "img" ? <img src={icon.src} alt="" width={16} height={16} /> : <icon.Icon />}
                {c.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Jump to node">
          {nodes.map((n) => (
            <CommandItem
              key={n.id}
              value={`node ${n.id}`}
              onSelect={() => run(() => {
                appStore.getState().select(n.id);
                const p = positions[n.id];
                if (p) setCenter(p.x + 75, p.y + 26, { zoom: 1.2, duration: 400 });
              })}
            >
              <Box /> {n.id}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
