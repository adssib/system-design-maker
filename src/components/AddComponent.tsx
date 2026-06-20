import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { COMPONENTS, iconFor } from "@/catalog";
import { typeOf } from "@/engine/typeInference";
import { appStore } from "@/store";

export default function AddComponent() {
  const [open, setOpen] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const insert = (id: string) => {
    // drop it at the centre of the visible canvas, then select it
    const p = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newId = appStore.getState().addNode(p.x - 75, p.y - 26, id);
    appStore.getState().select(newId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="flex-1 justify-start gap-2">
          <Plus /> Add component
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <Command>
          <CommandInput placeholder="Search components…" />
          <CommandList>
            <CommandEmpty>No components.</CommandEmpty>
            <CommandGroup>
              {COMPONENTS.map((c) => {
                const icon = iconFor(c.id, typeOf(c.id));
                return (
                  <CommandItem
                    key={c.id}
                    value={`${c.label} ${c.id} ${(c.aliases ?? []).join(" ")}`}
                    onSelect={() => insert(c.id)}
                  >
                    {icon.kind === "img" ? (
                      <img src={icon.src} alt="" width={16} height={16} className="shrink-0" />
                    ) : (
                      <icon.Icon />
                    )}
                    <span>{c.label}</span>
                    <span className="ml-auto text-xs uppercase tracking-wide text-muted-foreground">
                      {typeOf(c.id)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
