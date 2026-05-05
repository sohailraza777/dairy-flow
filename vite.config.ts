import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // This is the magic line that processes your Tailwind CSS!
  ],
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  build: { outDir: "dist" },
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false, // This allows Vite to automatically use 5174 if 5173 is busy
  },
});