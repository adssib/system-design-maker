import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { EXAMPLES, type Example } from "@/examples";

export default function NewProjectMenu({ onCreate }: { onCreate: (tpl?: Example) => void }) {
  const [open, setOpen] = useState(false);
  const pick = (tpl?: Example) => { setOpen(false); onCreate(tpl); };

  const Row = ({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
    >
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex flex-col">
        <span>{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="New project"><Plus /></Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1.5" align="end">
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">New project</div>
        <Row title="Blank" subtitle="empty canvas" onClick={() => pick()} />
        {EXAMPLES.map((ex) => (
          <Row
            key={ex.name}
            title={ex.name}
            subtitle="example template"
            onClick={() => pick(ex)}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}
