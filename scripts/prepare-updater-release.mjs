import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [version, tag, inputDirectory, outputDirectory, notesFile] = globalThis.process.argv.slice(2);

if (!version || !tag || !inputDirectory || !outputDirectory || !notesFile) {
  throw new Error("Usage: prepare-updater-release.mjs <version> <tag> <input> <output> <notes-file>");
}

if (tag !== `v${version}`) {
  throw new Error(`Tag ${tag} does not match package version ${version}`);
}

const files = await listFiles(inputDirectory);
const macDmg = findOne(files, (file) => file.endsWith(".dmg"), "macOS DMG");
const macUpdater = findOne(files, (file) => file.endsWith(".app.tar.gz"), "macOS updater archive");
const macSignature = findOne(files, (file) => file.endsWith(".app.tar.gz.sig"), "macOS updater signature");
const windowsInstaller = findOne(files, (file) => file.endsWith("-setup.exe"), "Windows NSIS installer");
const windowsSignature = findOne(files, (file) => file.endsWith("-setup.exe.sig"), "Windows updater signature");

await mkdir(outputDirectory, { recursive: true });

const assetNames = {
  macDmg: `WFMarketTracker-${version}-macOS-aarch64.dmg`,
  macUpdater: `WFMarketTracker-${version}-macOS-aarch64.app.tar.gz`,
  macSignature: `WFMarketTracker-${version}-macOS-aarch64.app.tar.gz.sig`,
  windowsInstaller: `WFMarketTracker-${version}-Windows-x64-Setup.exe`,
  windowsSignature: `WFMarketTracker-${version}-Windows-x64-Setup.exe.sig`
};

await Promise.all([
  copyFile(macDmg, path.join(outputDirectory, assetNames.macDmg)),
  copyFile(macUpdater, path.join(outputDirectory, assetNames.macUpdater)),
  copyFile(macSignature, path.join(outputDirectory, assetNames.macSignature)),
  copyFile(windowsInstaller, path.join(outputDirectory, assetNames.windowsInstaller)),
  copyFile(windowsSignature, path.join(outputDirectory, assetNames.windowsSignature))
]);

const notes = (await readFile(notesFile, "utf8")).trim() || `WFMarketTracker ${version}`;
const releaseBaseUrl = `https://github.com/convulsiva/warframe-price-viewer/releases/download/${tag}`;
const latest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "darwin-aarch64": {
      signature: (await readFile(macSignature, "utf8")).trim(),
      url: `${releaseBaseUrl}/${assetNames.macUpdater}`
    },
    "windows-x86_64": {
      signature: (await readFile(windowsSignature, "utf8")).trim(),
      url: `${releaseBaseUrl}/${assetNames.windowsInstaller}`
    }
  }
};

await writeFile(path.join(outputDirectory, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return nested.flat();
}

function findOne(candidates, predicate, label) {
  const matches = candidates.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`Expected one ${label}, found ${matches.length}: ${matches.join(", ")}`);
  }
  return matches[0];
}
