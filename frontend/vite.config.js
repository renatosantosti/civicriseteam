import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteTsConfigPaths from "vite-tsconfig-paths";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Stub node:async_hooks in client bundles so server-only TanStack Start code loads without throwing
function stubAsyncHooksForBrowser() {
  const stubPath = path.resolve(__dirname, "src/stubs/async-hooks-browser.js");
  return {
    name: "stub-async-hooks-for-browser",
    enforce: "pre",
    resolveId(id, _importer, options) {
      if (options?.ssr) return null;
      if (id === "node:async_hooks" || id === "async_hooks") return stubPath;
      return null;
    },
  };
}

const basePlugins = [
  stubAsyncHooksForBrowser(),
  tanstackStart(),
  viteReact(),
  TanStackRouterVite({
    autoCodeSplitting: true,
    appDirectory: 'src',
  }),
  tailwindcss(),
  viteTsConfigPaths({
    projects: ['./tsconfig.json'],
  }),
  netlify(),
];

// Add Sentry plugin only if auth token is available
if (process.env.SENTRY_AUTH_TOKEN) {
  basePlugins.push(
    sentryVitePlugin({
      org: "org-name",
      project: "project-name",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: '.vite',
  plugins: basePlugins,
  // Fixed deps list + noDiscovery to avoid EPERM on Windows when optimizer "updates" cache (rename deps -> deps_temp_*)
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-dom/client',
      '@tanstack/react-router',
      '@tanstack/react-router-devtools',
      // Exclude @tanstack/react-start so it is not pre-bundled by esbuild (which would externalize node:async_hooks).
      // On-demand resolution then uses our resolveId stub for node:async_hooks in client bundles.
      '@tanstack/react-store',
      '@tanstack/store',
      'convex',
      'lucide-react',
      'react-markdown',
      'highlight.js',
      'rehype-highlight',
      'rehype-raw',
      'rehype-sanitize',
      'bcryptjs',
      'jose',
      'uuid',
      '@anthropic-ai/sdk',
      '@sentry/react',
      '@netlify/blobs',
    ],
  },
  build: {
    // Only generate source maps if Sentry is enabled
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
});
