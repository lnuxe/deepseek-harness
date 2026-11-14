#!/usr/bin/env node
/**
 * Compile a Cursor-style `.canvas.tsx` source into a self-contained, gzipped
 * `.canvas.bundle.gz` payload — the exact on-disk contract the Cursor Canvas
 * sandbox iframe consumes (see `docs/cursor-canvas-sdk-reverse.md`).
 *
 * The transform is the same shape Cursor's IDE built-in compiler uses:
 * TypeScript JSX (automatic React runtime) → ESM JavaScript, with the
 * `cursor/canvas` import rewritten to the DSH equivalent SDK. Output is then
 * gzip-compressed (level 9) so the host can ship it straight into the iframe.
 *
 * Usage:
 *   node tools/compile-canvas.mjs <source.canvas.tsx> [out.canvas.bundle.gz]
 *
 * The `compileCanvas` export is also importable for bundling into a host
 * service that compiles canvases on demand.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SDK_ALIAS = "@deepseek-ai/dsh-client-ui-canvas";
const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = resolve(__dirname, "..");
const ESBUILD = resolve(PKG_DIR, "../../../node_modules/.bin/esbuild");

/**
 * Rewrite `cursor/canvas` (and any `cursor/canvas/*` subpath) imports to the
 * DSH SDK package. Handles both quote styles and a trailing subpath.
 */
export function rewriteCanvasImports(js) {
  return js
    .replace(/["']cursor\/canvas["']/g, `"${SDK_ALIAS}"`)
    .replace(/["']cursor\/canvas\/[^"']+["']/g, `"${SDK_ALIAS}"`);
}

/**
 * Transpile a `.canvas.tsx` source string to ESM JavaScript.
 */
export function transpileCanvas(source, fileName = "source.canvas.tsx") {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2024,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: "react",
      isolatedModules: true,
    },
    fileName,
  });
  return rewriteCanvasImports(result.outputText);
}

/**
 * Compile a `.canvas.tsx` file to gzipped bundle bytes.
 * @returns {Promise<{ source: string; js: string; gz: Buffer; gzLength: number; jsLength: number }>}
 */
export async function compileCanvas(sourcePath) {
  const source = readFileSync(sourcePath, "utf8");
  const js = transpileCanvas(source, sourcePath);
  const gz = gzipSync(Buffer.from(js, "utf8"), { level: 9 });
  return {
    source,
    js,
    gz,
    gzLength: gz.length,
    jsLength: Buffer.byteLength(js, "utf8"),
  };
}

/**
 * Bundle a `.canvas.tsx` into a **self-contained** IIFE that assigns the
 * default-exported component to `globalThis.__canvasComponent`. The SDK and
 * React are inlined, so the gzipped payload runs in an iframe with no module
 * resolution — exactly the on-disk contract the sandbox iframe consumes.
 *
 * `cursor/canvas` imports are aliased straight to the built SDK entry.
 * @returns {Promise<{ source: string; js: string; gz: Buffer; gzLength: number; jsLength: number }>}
 */
export async function bundleCanvas(sourcePath) {
  const source = readFileSync(sourcePath, "utf8");
  const absSource = resolve(sourcePath);
  const work = mkdtempSync(join(tmpdir(), "dsh-canvas-"));
  const entry = join(work, "entry.js");
  const out = join(work, "bundle.js");
  // esbuild has no direct stdin entry, so emit a one-line wrapper that
  // imports the canvas and renders its default export into `#root` using the
  // bundle's own React — the payload is fully self-contained (its own React +
  // SDK + react-dom), so the iframe host never mixes React instances.
  writeFileSync(
    entry,
    [
      `import Component from ${JSON.stringify(absSource)};`,
      `import { createRoot } from "react-dom/client";`,
      `import * as React from "react";`,
      `const el = document.getElementById("root");`,
      `if (el) createRoot(el).render(React.createElement(Component));`,
      `globalThis.__canvasComponent = Component;`,
    ].join("\n") + "\n",
    "utf8",
  );
  const result = spawnSync(
    ESBUILD,
    [
      entry,
      "--bundle",
      "--format=iife",
      "--platform=browser",
      "--jsx=automatic",
      "--define:process.env.NODE_ENV=\"production\"",
      "--alias:cursor/canvas=@deepseek-ai/dsh-client-ui-canvas",
      `--alias:@deepseek-ai/dsh-client-ui-canvas=${resolve(PKG_DIR, "lib/index.js")}`,
      `--outfile=${out}`,
      "--log-level=warning",
    ],
    { cwd: PKG_DIR, encoding: "utf8" },
  );
  if (result.status !== 0) {
    rmSync(work, { recursive: true, force: true });
    throw new Error(`esbuild bundle failed:\n${result.stderr || result.stdout}`);
  }
  let js;
  try {
    js = readFileSync(out, "utf8");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  const gz = gzipSync(Buffer.from(js, "utf8"), { level: 9 });
  return {
    source,
    js,
    gz,
    gzLength: gz.length,
    jsLength: Buffer.byteLength(js, "utf8"),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("usage: node compile-canvas.mjs <source.canvas.tsx> [out.canvas.bundle.gz] [--transpile]");
    process.exit(2);
  }
  const transpileOnly = argv.includes("--transpile");
  const args = argv.filter((a) => a !== "--transpile");
  const sourcePath = resolve(args[0]);
  const outPath = args[1] ? resolve(args[1]) : sourcePath.replace(/\.canvas\.tsx$/, ".canvas.bundle.gz");
  const { js, gz, jsLength, gzLength } = transpileOnly
    ? await compileCanvas(sourcePath)
    : await bundleCanvas(sourcePath);
  writeFileSync(outPath, gz);
  console.log(`${transpileOnly ? "transpiled" : "bundled"} ${sourcePath}`);
  console.log(`  -> ${outPath}`);
  console.log(`  js=${jsLength}B  gz=${gzLength}B  (${(gzLength / jsLength * 100).toFixed(1)}%)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
