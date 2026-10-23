import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createDatabaseApiMiddleware } from "./server/api.js";

const databaseApiPlugin = () => ({
  name: "database-api-plugin",
  configureServer(server) {
    server.middlewares.use(createDatabaseApiMiddleware());
  },
  configurePreviewServer(server) {
    server.middlewares.use(createDatabaseApiMiddleware());
  },
});

export default defineConfig({
  plugins: [react(), viteSingleFile(), databaseApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
