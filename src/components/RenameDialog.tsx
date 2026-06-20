import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore, appStore } from "@/store";

export default function RenameDialog() {
  const renaming = useAppStore((s) => s.renaming);
  const [value, setValue] = useState("");

  useEffect(() => { if (renaming) setValue(renaming); }, [renaming]);

  const close = () => appStore.getState().setRenaming(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (renaming && v && v !== renaming) appStore.getState().renameNode(renaming, v);
    close();
  };

  return (
    <Dialog open={!!renaming} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename node</DialogTitle>
          <DialogDescription>Updates the structure file and every flow hop that references it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit">Rename</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
