/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * Copy static files that need to be included in the extension
 */
function copyStaticFiles() {
  const filesToCopy = [
    {
      src: "packages/lsp/client/language-configuration.json",
      dest: "out/client/language-configuration.json",
    },
    {
      src: "packages/lsp/client/syntaxes/toon.tmLanguage.json",
      dest: "out/client/syntaxes/toon.tmLanguage.json",
    },
  ];

  for (const file of filesToCopy) {
    const destDir = path.dirname(file.dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(file.src, file.dest);
    console.log(`Copied ${file.src} -> ${file.dest}`);
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`
        );
      });
      console.log("[watch] build finished");
    });
  },
};

async function main() {
  // Copy static files first
  copyStaticFiles();

  const ctx = await esbuild.context({
    entryPoints: [
      "packages/lsp/client/src/extension.ts",
      "packages/lsp/server/src/server.ts",
    ],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outdir: "out",
    entryNames: "[dir]/[name]",
    outbase: "packages/lsp",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
