import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project pages serve under https://<user>.github.io/<repo>/, so the production
// build needs base = "/system-design-maker/". Dev server stays at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/system-design-maker/" : "/",
  plugins: [react()],
}));
