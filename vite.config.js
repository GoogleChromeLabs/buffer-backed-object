import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./buffer-backed-object.js",
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
