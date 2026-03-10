import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  base: "/facility/",
  plugins: [
    react(),
    tailwindcss(),
    metaImagesPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // Remove console.log in production builds
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB (default is 500KB)
    minify: false, // Use 'esbuild' for CI/CD builds; false for low-memory local builds
    rollupOptions: {
      output: {
        // Let Rollup handle chunk splitting automatically to avoid circular dependencies
        // between manually-assigned chunks (e.g. react-vendor <-> radix-ui).
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "https://cubed-mr.app",
        changeOrigin: true,
        secure: true,
      },
      "/facility/api": {
        target: "https://cubed-mr.app",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/facility/, ''),
      },
    },
  },
});
