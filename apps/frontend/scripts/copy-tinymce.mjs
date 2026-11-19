#!/usr/bin/env node
/**
 * Copy the self-hosted TinyMCE distribution into `public/tinymce` so the
 * rich-text editor loads it via `tinymceScriptSrc` (`${BASE_URL}tinymce/tinymce.min.js`,
 * i.e. `/inventory-app/tinymce/tinymce.min.js`)
 * with no Tiny Cloud API key (GPL, self-hosted — `licenseKey="gpl"`). Vite
 * serves `public/` as-is in dev and copies it into `dist/` on build.
 *
 * `public/tinymce` is generated (git-ignored). This runs on `postinstall` and
 * again at the start of `pnpm dev` / `pnpm build` (pnpm skips lifecycle
 * scripts when an install is already up to date, e.g. on a server whose
 * node_modules survived the last deploy). It's a no-op when the copy already
 * matches the installed `tinymce` version, so it always matches the version
 * pinned in package.json/pnpm-lock.yaml.
 */
import { access, cp, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules", "tinymce");
const dest = resolve(root, "public", "tinymce");

const versionOf = async (dir) => {
  try {
    return JSON.parse(await readFile(resolve(dir, "package.json"), "utf8")).version ?? null;
  } catch {
    return null;
  }
};

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

if (!(await exists(src))) {
  // tinymce not installed (e.g. an install that skipped it) — nothing to copy.
  console.warn("[copy-tinymce] node_modules/tinymce not found; skipping copy.");
} else {
  const version = await versionOf(src);
  const upToDate =
    version !== null &&
    version === (await versionOf(dest)) &&
    (await exists(resolve(dest, "tinymce.min.js")));
  if (!upToDate) {
    await rm(dest, { recursive: true, force: true });
    // pnpm links `node_modules/tinymce` into its store — `dereference` copies
    // the real files instead of a symlink pointing back into node_modules.
    await cp(src, dest, { recursive: true, dereference: true });
    console.log(`[copy-tinymce] copied tinymce ${version} -> public/tinymce`);
  }
}
