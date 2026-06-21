import { useState } from "react";
import { Panel, useReactFlow } from "@xyflow/react";
import { Download, Image as ImageIcon, Film } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { appStore, useAppStore } from "@/store";

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { getNodes, getViewport, setViewport } = useReactFlow();
  const steps = useAppStore((s) => s.flow.steps.length);

  const png = async () => {
    setOpen(false);
    const t = toast.loading("Rendering PNG…");
    try {
      const { exportPng } = await import("@/export");
      await exportPng(getNodes());
      toast.success("Saved diagram.png", { id: t });
    } catch {
      toast.error("PNG export failed", { id: t });
    }
  };

  const gif = async () => {
    setOpen(false);
    if (busy) return;
    setBusy(true);
    const t = toast.loading("Recording flow… 0%");
    try {
      const { recordGif } = await import("@/export");
      const st = appStore.getState();
      await recordGif({
        nodes: getNodes(),
        nodeTypes: new Map(st.structure.nodes.map((n) => [n.id, n.type])),
        edges: st.structure.edges,
        steps: st.flow.steps,
        speed: st.speed,
        setCaptureTime: (tt) => appStore.getState().setCaptureTime(tt),
        getViewport,
        setViewport,
        onProgress: (p) => toast.loading(`Recording flow… ${Math.round(p * 100)}%`, { id: t }),
      });
      toast.success("Saved flow.gif", { id: t });
    } catch {
      toast.error("GIF export failed", { id: t });
    } finally {
      appStore.getState().setCaptureTime(null);
      setBusy(false);
    }
  };

  const Row = ({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary disabled:opacity-50"
    >
      <span className="text-muted-foreground">{icon}</span> {label}
    </button>
  );

  return (
    <Panel position="top-right">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-1.5" disabled={busy}>
            <Download className="size-4" /> Export
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1.5" align="end">
          <Row icon={<ImageIcon className="size-4" />} label="Diagram (PNG)" onClick={png} />
          <Row icon={<Film className="size-4" />} label="Flow (GIF)" onClick={gif} disabled={busy || steps === 0} />
        </PopoverContent>
      </Popover>
    </Panel>
  );
}
