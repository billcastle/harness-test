// PostToolUse hook: format + lint-fix the edited file. Reports only remaining
// lint errors (truncated) back to Claude via exit code 2. Silent otherwise.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let file;
try {
  file = JSON.parse(readFileSync(0, "utf8"))?.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!file || !existsSync(file) || /node_modules|\/dist\/|\/\.next\//.test(file)) process.exit(0);

const bin = (name) => {
  const p = join(root, "node_modules", ".bin", name);
  return existsSync(p) ? p : null;
};
const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: root, stdio: "pipe", timeout: 25_000 }).toString();

const LINTABLE = /\.(m|c)?(j|t)sx?$|\.(vue|svelte|astro)$/;
const FORMATTABLE = /\.(m|c)?(j|t)sx?$|\.(json|css|scss|html|md|mdx|vue|svelte|astro|ya?ml)$/;
const rel = relative(root, file);

try {
  // Biome replaces both prettier and eslint when present.
  const biome = bin("biome");
  if (biome && (existsSync(join(root, "biome.json")) || existsSync(join(root, "biome.jsonc")))) {
    run(biome, ["check", "--write", "--no-errors-on-unmatched", file]);
    process.exit(0);
  }

  const prettier = bin("prettier");
  if (prettier && FORMATTABLE.test(file)) {
    try { run(prettier, ["--write", "--log-level", "silent", file]); } catch {}
  }

  const eslint = bin("eslint");
  if (eslint && LINTABLE.test(file)) run(eslint, ["--fix", "--quiet", file]);
} catch (err) {
  const out = `${err.stdout || ""}${err.stderr || ""}`.trim().split("\n").slice(0, 20).join("\n");
  if (out) {
    process.stderr.write(`Lint errors in ${rel}:\n${out}\n`);
    process.exit(2);
  }
}
process.exit(0);
