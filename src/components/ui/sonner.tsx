import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-card !border-border !text-foreground !rounded-lg",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
