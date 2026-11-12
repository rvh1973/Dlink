import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/Dlink/" : "/",
  build: {
    target: "safari15",
    sourcemap: true,
  },
});
