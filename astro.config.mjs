import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  adapter: cloudflare(),
  output: "server",
  integrations: [tailwind(), react()],
  vite: {
    build: {
      target: "es2022"
    }
  }
});
