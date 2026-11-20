import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const out = "docs";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync("public", out, { recursive: true });

await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["safari15"],
  outfile: `${out}/app.js`,
});
console.log("built ->", out);
