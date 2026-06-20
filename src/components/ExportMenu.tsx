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
  const { getNodes } = useReactFlow();
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
    const t = toast.loading("Recording flow… (keep this tab focused)");
    try {
      const { recordGif } = await import("@/export");
      appStore.getState().play();
      await recordGif({ durationMs: Math.min(9000, Math.max(3000, steps * 1400)) });
      toast.success("Saved flow.gif", { id: t });
    } catch {
      toast.error("GIF export failed", { id: t });
    } finally {
      appStore.getState().stop();
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
