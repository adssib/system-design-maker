import { useAppStore, appStore } from "@/store";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function FlowSelector() {
  const flows = useAppStore((s) => s.flows);
  const activeFlowName = useAppStore((s) => s.activeFlowName);

  if (flows.length === 0) return null;

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">Flow</span>
      <Select value={activeFlowName ?? ""} onValueChange={(n) => appStore.getState().setActiveFlow(n)}>
        <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select flow" /></SelectTrigger>
        <SelectContent>
          {flows.map((f) => (
            <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
