import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function HelpDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            aria-label="How it works"
            className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <HelpCircle className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>How it works</TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
          <DialogDescription>Two files: what the system is, and how one request moves through it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium text-foreground">1 · Structure — what exists</div>
            <p className="text-muted-foreground">Components and the connections that are possible.</p>
            <pre className="mt-1 overflow-x-auto rounded-md bg-background p-2.5 text-xs leading-relaxed">{`client  -> gateway
gateway -> [auth, api]
api     -> redis`}</pre>
          </div>
          <div>
            <div className="font-medium text-foreground">2 · Flow — how one request moves</div>
            <p className="text-muted-foreground">An ordered trace — line order is time order.</p>
            <pre className="mt-1 overflow-x-auto rounded-md bg-background p-2.5 text-xs leading-relaxed">{`flow "GET /profile":
  client  -> gateway
  gateway <-> auth
  api     ~> queue`}</pre>
          </div>
          <div className="grid grid-cols-[3rem_1fr] gap-x-3 gap-y-1.5 text-xs">
            <code className="text-foreground">{"->"}</code><span className="text-muted-foreground">one-way call</span>
            <code className="text-foreground">{"<->"}</code><span className="text-muted-foreground">call &amp; response (out, then back)</span>
            <code className="text-foreground">{"~>"}</code><span className="text-muted-foreground">async, fire-and-forget (doesn’t wait)</span>
          </div>
          <p className="text-muted-foreground">
            Hit <b className="text-foreground">Send request</b> to animate the flow. Add parts with{" "}
            <b className="text-foreground">+ Add component</b> or <b className="text-foreground">⌘K</b>. Open a ready-made
            system from the project menu.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
