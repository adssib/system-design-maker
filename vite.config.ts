import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Project pages serve under https://<user>.github.io/<repo>/, so the production
// build needs base = "/system-design-maker/". Dev server stays at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/system-design-maker/" : "/",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
}));
