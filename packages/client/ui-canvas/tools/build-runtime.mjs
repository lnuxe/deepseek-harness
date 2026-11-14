#!/usr/bin/env node
/**
 * Build the Canvas bundle's Client artifact (`bundle/client.js`).
 *
 * Steps:
 *   1. esbuild-bundle `tools/runtime-entry.tsx` (React + DSH Canvas SDK) into
 *      a single browser IIFE — the sandbox runtime that publishes
 *      `window.React` / `window.__canvasSdk` and renders a compiled canvas.
 *   2. base64-encode that IIFE so `client.js` can inline it as the iframe
 *      `srcdoc` boot script.
 *   3. Emit `bundle/client.js`, which registers a `.canvas.tsx` document
 *      renderer with the right-Sidebar document preview: when the user opens a
 *      `.canvas.tsx` file, the renderer reads its source, compiles it through
 *      the Host `/api/canvas/compile` route, and posts the compiled IIFE into
 *      the sandbox iframe — the DSH equivalent of Cursor opening a
 *      `.canvas.tsx` beside the chat as a live panel.
 *
 * Run from the package root:
 *   node tools/build-runtime.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");
const toolsDir = resolve(pkgDir, "tools");
const bundleDir = resolve(pkgDir, "bundle");
const examplesDir = resolve(pkgDir, "examples");

const ESBUILD = resolve(pkgDir, "../../../node_modules/.bin/esbuild");
const ENTRY = resolve(toolsDir, "runtime-entry.tsx");
const IIFE_OUT = resolve(examplesDir, "canvas.runtime.js");

function runEsbuild() {
  const result = spawnSync(
    ESBUILD,
    [
      ENTRY,
      "--bundle",
      "--format=iife",
      "--platform=browser",
      "--jsx=automatic",
      '--define:process.env.NODE_ENV="production"',
      "--alias:@deepseek-ai/dsh-client-ui-canvas=./lib/index.js",
      `--outfile=${IIFE_OUT}`,
      "--log-level=warning",
    ],
    { cwd: pkgDir, encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  const js = readFileSync(IIFE_OUT, "utf8");
  rmSync(IIFE_OUT, { force: true });
  return js;
}

function clientJs(runtimeB64) {
  return `window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-canvas-bundle',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const RUNTIME_B64 = '${runtimeB64}';

    // ------------------------------------------------------------------
    // Sandbox runtime (React + SDK) embedded as the iframe boot script.
    // ------------------------------------------------------------------
    function decodeRuntime() {
      const bin = atob(RUNTIME_B64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    function sandboxSrcDoc() {
      // Body surface/font/padding (24px 32px) is applied at runtime by the
      // embedded applyBodyTheme, matching Cursor CanvasShell. Here we only
      // keep the box model contract: border-box sizing so the body padding is
      // contained, a 100%-tall body so the iframe fills the preview panel, and
      // overflow:auto so content scrolls inside the iframe (Cursor canvas
      // panel behaves the same way).
      return '<!doctype html><html><head><meta charset="utf-8"><style>' +
        '*{box-sizing:border-box}html,body{height:100%;margin:0}body{overflow:auto}' +
        '</style></head><body><div id="root"></div><script>' + decodeRuntime() + '<\\/script></body></html>';
    }

    // ------------------------------------------------------------------
    // File address grammar, copied from the document preview's public
    // address parser so a renderer can resolve a file without importing a
    // Harness Client package.
    // ------------------------------------------------------------------
    const FILE_ADDRESS_PREFIX = 'dsh-resource://file/';
    function parseFileAddress(address) {
      try {
        if (!address.startsWith(FILE_ADDRESS_PREFIX)) return undefined;
        const end = address.search(/[?#]/);
        const rest0 = address.slice(20, end === -1 ? undefined : end);
        const parts = rest0.split('/');
        const scope = parts[0];
        if (scope === 'session') {
          const id = parts[1];
          const segments = parts.slice(2);
          if (id === undefined || id === '' || segments.length === 0) return undefined;
          return {
            scope,
            sessionId: decodeURIComponent(id),
            path: segments.map(decodeURIComponent).join('/'),
          };
        }
        return undefined;
      } catch {
        return undefined;
      }
    }
    function hostFileOf(address) {
      const parsed = parseFileAddress(address);
      if (!parsed || parsed.scope !== 'session') {
        throw new Error('ui-canvas: not a session file address "' + address + '"');
      }
      return { sessionId: parsed.sessionId, path: parsed.path };
    }

    // ------------------------------------------------------------------
    // Post a compiled sandbox IIFE into an iframe once its runtime boots.
    // ------------------------------------------------------------------
    function postJsToSandbox(iframe, js, theme) {
      const send = () => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ source: 'dsh-canvas-document', js, theme }, '*');
        }
      };
      const doc = iframe.contentDocument;
      if (doc && doc.readyState === 'complete') {
        send();
      } else {
        iframe.addEventListener('load', send, { once: true });
      }
    }

    // ------------------------------------------------------------------
    // The document body selected when a .canvas.tsx file opens in the
    // right-Sidebar document preview. Props follow the document owner:
    //   resourceAddress, content (renderer mode), useTabInfo, readBytes.
    // ------------------------------------------------------------------
    function CanvasBody(props) {
      const { resourceAddress, content, readBytes, themeService, subscribeTheme } = props;
      const { tab } = props.useTabInfo();
      const iframeRef = useRef(null);
      const [js, setJs] = useState(null);
      const [error, setError] = useState(null);
      const [loading, setLoading] = useState(false);
      const [themeKind, setThemeKind] = useState(() =>
        themeService && themeService.getTheme
          ? themeService.getTheme().active.colorScheme
          : undefined,
      );
      useEffect(() => {
        if (!themeService || !subscribeTheme) return;
        return subscribeTheme((kind) => setThemeKind(kind));
      }, [themeService, subscribeTheme]);

      const revision = content && content.kind === 'renderer' ? content.revision : 0;

      useEffect(() => {
        if (!content || content.kind !== 'renderer') return;
        const controller = new AbortController();
        const signal = AbortSignal.any([controller.signal, tab.signal]);
        let disposed = false;

        (async () => {
          try {
            setLoading(true);
            setError(null);
            const file = hostFileOf(resourceAddress);
            const readRes = await readBytes(file.sessionId, file.path, signal);
            if (!readRes || readRes.ok !== true) {
              throw new Error(readRes && readRes.error ? readRes.error.message : 'read failed');
            }
            const source = new TextDecoder().decode(readRes.value.data);

            const resp = await fetch('/api/canvas/compile', {
              method: 'POST',
              headers: { 'content-type': 'text/plain' },
              body: source,
              signal,
            });
            if (!resp.ok) throw new Error('compile HTTP ' + resp.status);
            const data = await resp.json();
            if (!data.ok) throw new Error(data.error || 'compile failed');
            if (disposed || signal.aborted) return;

            setJs(data.js);
            setLoading(false);
            content.loaded(readRes.value.version);
          } catch (err) {
            if (disposed || signal.aborted) return;
            setLoading(false);
            setError(err instanceof Error ? err.message : String(err));
            content.failed();
          }
        })();

        return () => {
          disposed = true;
          controller.abort();
        };
      }, [revision, resourceAddress, readBytes]);

      useEffect(() => {
        if (js && iframeRef.current) {
          postJsToSandbox(iframeRef.current, js, themeKind ? { kind: themeKind } : undefined);
        }
      }, [js, themeKind]);

      const status = error
        ? h('div', { style: statusStyle('error') }, 'Canvas 编译失败：' + error)
        : loading
          ? h('div', { style: statusStyle('info') }, '渲染 Canvas…')
          : null;

      return h('div', { style: { position: 'relative', width: '100%', height: '100%' } },
        status,
        h('iframe', {
          ref: iframeRef,
          srcDoc: sandboxSrcDoc(),
          title: 'Canvas',
          sandbox: 'allow-scripts allow-same-origin',
          style: { display: 'block', width: '100%', height: '100%', border: 'none' },
        }),
      );
    }

    function statusStyle(kind) {
      const base = {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
        padding: '10px 14px', fontSize: 12, fontFamily: 'system-ui, sans-serif',
      };
      if (kind === 'error') {
        return { ...base, background: 'rgba(210,60,60,0.12)', color: 'var(--dsw-alias-error, #d23c3c)' };
      }
      return { ...base, background: 'var(--dsw-alias-surface-container, rgba(0,0,0,0.04))', color: 'var(--dsw-alias-text-secondary, #666)' };
    }

    return {
      inject: ['slots', 'documentPreviews', 'remote', 'remote.workspaceFiles', 'theme'],
      apply(ctx) {
        const readBytes = (sessionId, path, signal) =>
          ctx.remote.workspaceFiles.readBytes(sessionId, path, {}, signal);

        // Resolve the host theme once and subscribe to theme/change so the
        // canvas surface tracks the DSH editor theme (Cursor resolves canvas
        // colors from the host theme the same way, not from the OS scheme).
        const themeService = ctx.theme;
        const subscribeTheme = (cb) => {
          if (!themeService) return () => {};
          const off = ctx.on('theme/change', () => cb(themeService.getTheme().active.colorScheme));
          return typeof off === 'function' ? off : () => {};
        };

        ctx.effect(() => ctx.documentPreviews.register({
          id: 'canvas',
          extensions: ['canvas.tsx'],
          priority: 'extension',
          title: () => 'Canvas',
          loading: 'renderer',
          wrap: false,
        }));

        ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register({
          name: 'sidebar.right.tab.document',
          key: 'canvas',
        }, (props) => h(CanvasBody, { ...props, readBytes, themeService, subscribeTheme }))));
      },
    };
  },
});
`;
}

function main() {
  const iife = runEsbuild();
  const runtimeB64 = Buffer.from(iife, "utf8").toString("base64");
  mkdirSync(bundleDir, { recursive: true });
  const out = resolve(bundleDir, "client.js");
  writeFileSync(out, clientJs(runtimeB64));
  console.log(`runtime IIFE: ${iife.length}B`);
  console.log(`runtime base64: ${runtimeB64.length}B`);
  console.log(`client.js: ${out}`);
}

main();
