import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The desktop app's screens: built into dist-renderer and served from app://codexa by main.js.
export default defineConfig({
  root: "renderer",
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../dist-renderer", emptyOutDir: true, target: "chrome130", chunkSizeWarningLimit: 4000 },
});
