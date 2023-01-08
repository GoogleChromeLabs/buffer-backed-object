import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./buffer-backed-object.ts",
      formats: ["es", "cjs", "umd"],
      name: "buffer-backed-object",
      fileName: (format, entryName) => {
        if (format == "es") return `${entryName}.js`;
        if (format == "cjs") return `${entryName}.cjs`;
        if (format == "umd") return `${entryName}.umd.js`;
      },
    },
  },
});
