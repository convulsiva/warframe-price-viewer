import { createPrivateKey, createPublicKey, generateKeyPairSync } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const privateKeyPath = process.env.WFM_LICENSE_PRIVATE_KEY
  ?? path.join(os.homedir(), ".wfmarkettracker", "license-private-key.pem");
const publicKeyPath = path.resolve("src-tauri/license-public-key.txt");

let privateKey;
try {
  privateKey = createPrivateKey(await readFile(privateKeyPath));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  try {
    await readFile(publicKeyPath);
    throw new Error(
      `Private key is missing but ${publicKeyPath} already exists. Restore the original private key instead of rotating it.`,
      { cause: error }
    );
  } catch (publicKeyError) {
    if (publicKeyError?.code !== "ENOENT") throw publicKeyError;
  }
  const generated = generateKeyPairSync("ed25519");
  privateKey = generated.privateKey;
  await mkdir(path.dirname(privateKeyPath), { recursive: true });
  await writeFile(
    privateKeyPath,
    privateKey.export({ format: "pem", type: "pkcs8" }),
    { mode: 0o600 }
  );
  await chmod(privateKeyPath, 0o600);
}

const publicDer = createPublicKey(privateKey).export({ format: "der", type: "spki" });
if (publicDer.length !== 44) {
  throw new Error(`Unexpected Ed25519 public key length: ${publicDer.length}`);
}

await writeFile(publicKeyPath, `${publicDer.subarray(-32).toString("base64")}\n`);
console.log(`Private key: ${privateKeyPath}`);
console.log(`Public key:  ${publicKeyPath}`);
