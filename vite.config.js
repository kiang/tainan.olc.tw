import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "docs",
    emptyOutDir: false, // Preserve existing files in docs/ (like /p/ projects)
    rollupOptions: {
      output: {
        // Keep assets in the assets directory
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/scss/utility/_colors.scss";
        @import "@/assets/scss/utility/_reset.scss";
        @import "@/assets/scss/utility/_fonts.scss";
        @import "@/assets/scss/utility/_breakpoints.scss";
        @import "@/assets/scss/utility/_dark-mode.scss";
        @import "@/assets/scss/layout/_container.scss";
        @import "@/assets/scss/layout/_main.scss";
        `,
      },
    },
  },
  server: {
    host: true,
  },
});
