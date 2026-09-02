import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Keep generated carriers relocatable so the same build can live at any
  // Estate sub-route or independent host without rewriting asset URLs.
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
