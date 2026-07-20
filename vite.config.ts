import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/wfm": {
        target: "https://api.warframe.market/v2",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wfm/, ""),
        headers: {
          Accept: "application/json",
          platform: "pc",
          crossplay: "true"
        }
      }
    }
  },
  preview: {
    proxy: {
      "/api/wfm": {
        target: "https://api.warframe.market/v2",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wfm/, ""),
        headers: {
          Accept: "application/json",
          platform: "pc",
          crossplay: "true"
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
