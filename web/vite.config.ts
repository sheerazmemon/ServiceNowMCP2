import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "web",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "../public/widget",
    emptyOutDir: true,
    assetsInlineLimit: 100000000
  }
});
