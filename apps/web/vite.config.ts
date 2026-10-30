import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `source` is the resolution the whole repository uses (AGENTS.md §4): the workspace packages are built from their
// sources by Vite, not from `dist`, so a stale build cannot be what the browser runs.
export default defineConfig({
	plugins: [react()],
	resolve: { conditions: ["source"] },
	server: { port: 5173, strictPort: false },
	build: { outDir: "dist", emptyOutDir: true },
});
