import { createPrivateKey, randomBytes, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const args = parseArgs(process.argv.slice(2));
const interactive = !args.customer;
const answers = interactive ? await promptForLicense() : args;
const customer = answers.customer?.trim();

if (!customer) throw new Error("Customer name or email is required");

const expiresAt = resolveExpiration(answers);
const privateKeyPath = process.env.WFM_LICENSE_PRIVATE_KEY
  ?? path.join(os.homedir(), ".wfmarkettracker", "license-private-key.pem");
const privateKey = createPrivateKey(await readFile(privateKeyPath));
const issuedAt = new Date().toISOString();
const payload = {
  version: 1,
  license_id: answers.id?.trim() || `WFM-${randomBytes(6).toString("hex").toUpperCase()}`,
  customer,
  issued_at: issuedAt,
  expires_at: expiresAt
};
const payloadSegment = Buffer.from(JSON.stringify(payload)).toString("base64url");
const message = `WFM1.${payloadSegment}`;
const signature = sign(null, Buffer.from(message), privateKey).toString("base64url");

console.log("\nLicense created");
console.log(`ID:       ${payload.license_id}`);
console.log(`Customer: ${payload.customer}`);
console.log(`Expires:  ${payload.expires_at ?? "Lifetime"}`);
console.log("\nLicense key:\n");
console.log(`${message}.${signature}`);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--lifetime") parsed.lifetime = true;
    else if (value === "--customer") parsed.customer = values[++index];
    else if (value === "--days") parsed.days = values[++index];
    else if (value === "--expires") parsed.expires = values[++index];
    else if (value === "--id") parsed.id = values[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  return parsed;
}

async function promptForLicense() {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const customer = await prompt.question("Customer name or email: ");
    const duration = (await prompt.question("Duration in days, or press Enter for lifetime: ")).trim();
    return duration ? { customer, days: duration } : { customer, lifetime: true };
  } finally {
    prompt.close();
  }
}

function resolveExpiration(options) {
  const modes = [Boolean(options.lifetime), Boolean(options.days), Boolean(options.expires)].filter(Boolean);
  if (modes.length !== 1) {
    throw new Error("Choose exactly one: --lifetime, --days <number>, or --expires <date>");
  }
  if (options.lifetime) return null;
  if (options.days) {
    const days = Number(options.days);
    if (!Number.isInteger(days) || days <= 0) throw new Error("--days must be a positive whole number");
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(options.expires);
  const expiresAt = new Date(dateOnly ? `${options.expires}T23:59:59.999Z` : options.expires);
  if (Number.isNaN(expiresAt.getTime())) throw new Error("--expires must be a valid date or ISO timestamp");
  if (expiresAt.getTime() <= Date.now()) throw new Error("Expiration must be in the future");
  return expiresAt.toISOString();
}
