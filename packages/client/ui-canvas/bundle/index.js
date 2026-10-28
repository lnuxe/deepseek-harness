/**
 * Host half of the DSH Canvas bundle.
 *
 * Registers an exact Fetch route under the shared `/api` RPC channel that
 * compiles a Cursor-style `.canvas.tsx` source string into a self-executing
 * sandbox IIFE. This mirrors the Cursor IDE's built-in `.canvas.tsx` compiler:
 * the Client document renderer reads the opened file, POSTs its source here,
 * and the returned IIFE assigns the canvas default export to
 * `window.__canvasComponent` inside the sandbox iframe (whose runtime has
 * already published `window.React` and `window.__canvasSdk`).
 *
 * The transform is TypeScript JSX (classic `React.createElement` runtime) →
 * ESM JavaScript, then `cursor/canvas` imports are rewritten to the sandbox's
 * `window.__canvasSdk` surface and `export default` becomes
 * `window.__canvasComponent`.
 */
import ts from "typescript";

const SDK_ALIAS = "window.__canvasSdk";

/**
 * Transpile a `.canvas.tsx` source string to ESM JavaScript with the classic
 * JSX runtime (`React.createElement`), which the sandbox runtime satisfies
 * through its published `window.React`.
 */
function transpileCanvas(source, fileName = "source.canvas.tsx") {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment",
      isolatedModules: true,
    },
    fileName,
  });
  return result.outputText;
}

/**
 * Rewrite `cursor/canvas` imports to destructure from the sandbox SDK global.
 * Handles named, default+named, and default-only import forms.
 */
function rewriteCanvasImports(js) {
  return js
    .replace(
      /import\s*\{([^}]*)\}\s*from\s*["']cursor\/canvas["']\s*;?/g,
      (_m, names) => `const { ${names.trim()} } = ${SDK_ALIAS};`,
    )
    .replace(
      /import\s+([A-Za-z_$][\w$]*)\s*,\s*\{([^}]*)\}\s*from\s*["']cursor\/canvas["']\s*;?/g,
      (_m, def, names) => `const { default: ${def}, ${names.trim()} } = ${SDK_ALIAS};`,
    )
    .replace(
      /import\s+([A-Za-z_$][\w$]*)\s+from\s*["']cursor\/canvas["']\s*;?/g,
      (_m, def) => `const { default: ${def} } = ${SDK_ALIAS};`,
    );
}

/**
 * Wrap transpiled and rewritten ESM into a self-executing IIFE. `export
 * default` becomes the sandbox's `window.__canvasComponent`; any residual
 * named `export` keywords are dropped so their declarations stay local.
 */
function toSandboxIIFE(js) {
  let body = js.replace(/export\s+default\s+/g, "window.__canvasComponent = ");
  body = body.replace(/\bexport\s+/g, "");
  return `(function () {\n"use strict";\nvar React = window.React;\n${body}\n})();`;
}

/** Compile `.canvas.tsx` source into the sandbox IIFE string. */
export function compileCanvasSource(source) {
  return toSandboxIIFE(rewriteCanvasImports(transpileCanvas(source)));
}

/**
 * @param {import("@deepseek-ai/cordis").Context} ctx
 */
export function apply(ctx) {
  ctx.inject(["connection"], (scope) => {
    const route = {
      path: "/api/canvas/compile",
      methods: ["POST"],
      requestBody: "buffered",
      fetch: async (request) => {
        try {
          const source = await request.text();
          const js = compileCanvasSource(source);
          return new Response(JSON.stringify({ ok: true, js }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    };
    scope.connection.fetch.register(route);
  });
}

export const inject = ["connection"];
