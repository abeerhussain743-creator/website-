#!/usr/bin/env node
/**
 * Run any command with monorepo-root .env loaded.
 * Usage: node scripts/run-with-env.cjs <cmd> [args...]
 */
require("./load-root-env.cjs");

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: node scripts/run-with-env.cjs <cmd> [args...]");
  process.exit(1);
}

const result = spawnSync(cmd, args, {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
