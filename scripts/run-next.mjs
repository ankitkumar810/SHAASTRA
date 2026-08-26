import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const wasmDirectory = join(projectRoot, "node_modules", "@next", "swc-wasm-nodejs");
const nextCli = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextCli, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: { ...process.env, NEXT_TEST_WASM_DIR: wasmDirectory },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
