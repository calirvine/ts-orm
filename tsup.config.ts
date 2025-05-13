import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["packages/core/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  target: "es2020",
  platform: "neutral", // This makes it work for both Node.js and Cloudflare Workers
  esbuildOptions(options) {
    options.conditions = ["import", "module"];
  },
});
