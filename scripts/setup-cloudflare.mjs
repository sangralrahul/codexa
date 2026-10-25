#!/usr/bin/env node
/**
 * One-command Cloudflare setup: `npm run setup`.
 *
 * Asks for the few things only the operator knows (AI key, Customer.io key,
 * their email), generates the rest, deploys, stores the secrets on the
 * Worker and creates the database tables. Safe to run again: secrets that
 * are already set are kept (re-generating ENCRYPTION_KEY would make saved
 * secrets unreadable), so a second run is just "deploy the latest code".
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const BACKUP_FILE = "codexa-secrets-backup.txt";
const say = (msg = "") => console.log(msg);
const step = (n, msg) => say(`\n=== Step ${n}: ${msg} ===`);
const fail = (msg) => {
  say(`\n✘ ${msg}`);
  process.exit(1);
};

/** Runs a command; output goes straight to the terminal unless `capture`. */
function run(cmd, { capture = false, input } = {}) {
  const r = spawnSync(cmd, { shell: true, stdio: capture ? ["pipe", "pipe", "pipe"] : input !== undefined ? ["pipe", "inherit", "inherit"] : "inherit", input, encoding: "utf8" });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

let rl = null;
let lines = null;
async function ask(question, { fallback = "", validate } = {}) {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin });
    lines = rl[Symbol.asyncIterator]();
  }
  for (;;) {
    process.stdout.write(`${question}${fallback ? ` [${fallback}]` : ""}: `);
    const next = await lines.next();
    if (next.done) fail("No answer given.");
    const answer = next.value.trim() || fallback;
    const problem = validate?.(answer);
    if (!problem) return answer;
    say(`  ${problem}`);
  }
}

function customDomain() {
  const config = fs.readFileSync("wrangler.jsonc", "utf8");
  const m = config.match(/^\s*\{\s*"pattern":\s*"([^"]+)",\s*"custom_domain":\s*true/m);
  return m ? m[1] : null;
}

function readBackup() {
  if (!fs.existsSync(BACKUP_FILE)) return {};
  const values = {};
  for (const line of fs.readFileSync(BACKUP_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) values[m[1]] = m[2];
  }
  return values;
}

say("Codexa setup for Cloudflare. Answer the questions; everything else is automatic.");
say("Press Ctrl+C at any time to stop.");

// 1. Checks
step(1, "Checking your computer");
for (const f of [".env", ".env.local", ".env.production"]) {
  if (fs.existsSync(f)) fail(`Please delete or rename the file "${f}" in the codexa folder first (the build would copy it into Codexa), then run this again.`);
}
const domain = customDomain();
const needsDocker = /^\s*"containers":/m.test(fs.readFileSync("wrangler.jsonc", "utf8"));
if (needsDocker && !run("docker info", { capture: true }).ok) {
  fail("Docker is not running. Open Docker Desktop, wait until it says \"Engine running\", then run this again.");
}
say("✔ Ready" + (needsDocker ? " (Docker is running)" : ""));

// 2. Login
step(2, "Cloudflare login");
if (!run("npx wrangler whoami", { capture: true }).out.match(/associated with the email|You are logged in/i)) {
  say("A browser window opens: log in to Cloudflare and click Allow.");
  if (!run("npx wrangler login").ok) fail("Cloudflare login did not finish. Run this again.");
}
say("✔ Logged in to Cloudflare");

// 3. Questions (only for secrets not already on the Worker)
step(3, "A few questions");
const listed = run("npx wrangler secret list --format json", { capture: true });
let existing = [];
try {
  existing = JSON.parse(listed.out.slice(listed.out.indexOf("["))).map((s) => s.name);
} catch {
  // A brand-new Worker has no secrets yet. Any other failure must stop here: guessing "none" would
  // replace ENCRYPTION_KEY and make secrets saved in Codexa unreadable.
  if (!/10007|not found|does not exist/i.test(listed.out)) fail("Could not read your Cloudflare settings (check your internet connection), then run this again.");
}
const backup = readBackup();
const secrets = {};
const missing = (name) => !existing.includes(name);

if (missing("ANTHROPIC_API_KEY")) {
  secrets.ANTHROPIC_API_KEY = await ask("Paste your Anthropic API key (starts with sk-ant-)", { validate: (v) => (v.startsWith("sk-ant-") ? null : "That doesn't look like an Anthropic key. It starts with sk-ant-") });
}
if (missing("CUSTOMERIO_APP_API_KEY")) {
  secrets.CUSTOMERIO_APP_API_KEY = await ask("Paste your Customer.io App API key", { validate: (v) => (v.length >= 16 ? null : "That looks too short. Copy the App API key from Customer.io → Settings → API Credentials.") });
}
if (missing("CUSTOMERIO_REGION")) {
  secrets.CUSTOMERIO_REGION = (await ask("Is your Customer.io account in the US or EU? Type us or eu", { fallback: "us", validate: (v) => (/^(us|eu)$/i.test(v) ? null : "Type us or eu") })).toLowerCase();
}
if (missing("ADMIN_EMAILS")) {
  secrets.ADMIN_EMAILS = (await ask("Your email address (this account becomes the admin)", { validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Please type a valid email address") })).toLowerCase();
}
if (missing("EMAIL_FROM")) {
  const fallback = `Codexa <no-reply@${domain ? domain.split(".").slice(-2).join(".") : "example.com"}>`;
  secrets.EMAIL_FROM = await ask("Sender for Codexa's emails (its domain must be verified in Customer.io)", { fallback });
}
if (missing("APP_URL") && domain) secrets.APP_URL = `https://${domain}`;
for (const name of ["SESSION_SECRET", "ENCRYPTION_KEY"]) {
  if (missing(name)) secrets[name] = backup[name] ?? randomBytes(32).toString("base64");
}
rl?.close();

// Keep a private copy of the generated keys: ENCRYPTION_KEY can never be recovered from Cloudflare.
if (secrets.ENCRYPTION_KEY || secrets.SESSION_SECRET) {
  const lines = [
    "# Codexa keys. Keep this file private (it is never uploaded to GitHub).",
    "# If ENCRYPTION_KEY is lost, secrets saved inside Codexa can't be read again.",
    ...["SESSION_SECRET", "ENCRYPTION_KEY"].flatMap((k) => (secrets[k] ?? backup[k] ? [`${k}=${secrets[k] ?? backup[k]}`] : [])),
  ];
  fs.writeFileSync(BACKUP_FILE, lines.join(os.EOL) + os.EOL);
}

// 4. Secrets (before the first deploy, so Codexa never runs without them; this creates the Worker if needed)
const names = Object.keys(secrets);
if (names.length) {
  step(4, "Saving your keys in Cloudflare");
  const tmp = path.join(os.tmpdir(), `codexa-secrets-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(secrets), { mode: 0o600 });
  const saved = run(`npx wrangler secret bulk "${tmp}"`, { input: "y\n" });
  fs.rmSync(tmp, { force: true });
  if (!saved.ok) fail("Saving the keys failed. Run this again (your answers are not lost: only missing keys are asked for).");
  say(`✔ Saved: ${names.join(", ")}`);
} else {
  step(4, "Your keys are already saved in Cloudflare");
}

// 5. Deploy
step(5, "Building and uploading Codexa (this takes a few minutes)");
// Make sure the Windows-safe build patch is in place even if postinstall was skipped.
run("node scripts/patch-opennext-windows.mjs");
if (!run("npm run cf:build").ok) {
  fail(
    process.platform === "win32"
      ? 'The build failed. If the error mentions "EPERM" and "symlink", turn on Windows Developer Mode (press Windows+R, type ms-settings:developers, switch Developer Mode on), open a new Command Prompt and run this again. Otherwise, take a screenshot of the red error above and ask for help.'
      : "The build failed. Take a screenshot of the red error above and ask for help.",
  );
}
if (!run("npx opennextjs-cloudflare deploy").ok) {
  // Cloudflare sometimes finishes the Worker but not the container settings ("Re-run the same
  // wrangler deploy command"). Retry the upload alone; the build output is reused.
  say("\nThe upload didn't fully finish. Trying the upload again (no rebuild needed)...");
  if (!run("npx opennextjs-cloudflare deploy").ok) fail("The upload failed. Take a screenshot of the red error above and ask for help.");
}
say("✔ Codexa uploaded");

// 6. Database
step(6, "Creating the database tables");
if (!run("npx wrangler d1 migrations apply codexa --remote", { input: "y\n" }).ok) fail("Creating the tables failed. Run this again.");
say("✔ Database ready");

say("\n==============================================");
say("Done! Codexa is online.");
if (domain) {
  say(`\nOpen: https://${domain}`);
  say("\nIf previews don't open yet, add this one DNS record (only once):");
  say(`  Cloudflare dashboard → ${domain.split(".").slice(-2).join(".")} → DNS → Records → Add record`);
  say("  Type: AAAA   Name: *   IPv6 address: 100::   Proxy status: Proxied (orange cloud)");
} else {
  say("\nOpen the workers.dev address printed in Step 5, then set it as your address:");
  say("  npx wrangler secret put APP_URL");
}
say(`\nSign up with ${secrets.ADMIN_EMAILS ?? "your admin email"} and click the link in the email we send.`);
if (secrets.ENCRYPTION_KEY) say(`\nYour keys are backed up in ${BACKUP_FILE} in the codexa folder. Keep it private and don't delete it.`);
say("==============================================");
