import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import { encodeShare } from "@/share/url";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function ShareButton() {
  const structureText = useAppStore((s) => s.structureText);
  const flowText = useAppStore((s) => s.flowText);

  const share = async () => {
    const hash = encodeShare({ structureText, flowText });
    const url = `${location.origin}${location.pathname}#${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied", { description: "Anyone who opens it gets this design as a new project." });
    } catch {
      // clipboard blocked (e.g. insecure context) — surface the URL so it can be copied manually
      toast("Copy this share link", { description: url, duration: 8000 });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={share}
          aria-label="Copy share link"
          className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Share2 className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Copy a shareable link</TooltipContent>
    </Tooltip>
  );
}
