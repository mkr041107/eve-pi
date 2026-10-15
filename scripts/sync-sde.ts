import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { execFileSync } from "child_process";
import { platform } from "os";

const OUT_DIR = path.join(process.cwd(), "data", "sde");
const ZIP_URL =
  "https://developers.eveonline.com/static-data/eve-online-static-data-latest-jsonl.zip";

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed ${res.status}`);
  await pipeline(
    Readable.fromWeb(res.body as import("stream/web").ReadableStream),
    createWriteStream(dest),
  );
}

function extractZip(zipPath: string, destDir: string) {
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  if (platform() === "win32") {
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "inherit" },
    );
  } else {
    execFileSync("unzip", ["-o", zipPath, "-d", destDir], { stdio: "inherit" });
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const zipPath = path.join(OUT_DIR, "sde.zip");
  console.log("Downloading SDE…");
  await download(ZIP_URL, zipPath);

  const extractDir = path.join(OUT_DIR, "extracted");
  console.log("Extracting…");
  extractZip(zipPath, extractDir);

  const planetPath = path.join(extractDir, "planetSchematics.jsonl");
  const typesPath = path.join(extractDir, "types.jsonl");
  if (!existsSync(planetPath) || !existsSync(typesPath)) {
    throw new Error("Expected planetSchematics.jsonl and types.jsonl in SDE zip");
  }

  const schematics: Record<number, unknown> = {};
  for (const line of readFileSync(planetPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as {
      _key: number;
      cycleTime: number;
      name: { en: string };
      types: { _key: number; isInput: boolean; quantity: number }[];
    };
    schematics[row._key] = {
      schematicId: row._key,
      cycleTimeSeconds: row.cycleTime,
      name: row.name.en,
      types: row.types.map((t) => ({
        typeId: t._key,
        isInput: t.isInput,
        quantity: t.quantity,
      })),
    };
  }

  const typeNames: Record<number, string> = {};
  const launchPadTypeIds: number[] = [];
  for (const line of readFileSync(typesPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as {
      _key: number;
      name?: { en?: string };
    };
    const name = row.name?.en ?? `Type ${row._key}`;
    typeNames[row._key] = name;
    if (name.toLowerCase().includes("launchpad")) {
      launchPadTypeIds.push(row._key);
    }
  }

  const metaRes = await fetch(
    "https://developers.eveonline.com/static-data/tranquility/latest.jsonl",
  );
  const meta = JSON.parse((await metaRes.text()).trim()) as {
    buildNumber: number;
  };

  const bundle = {
    buildNumber: meta.buildNumber,
    typeNames,
    launchPadTypeIds,
    schematics,
  };

  const json = JSON.stringify(bundle);
  const outFile = path.join(OUT_DIR, "bundle.json");
  writeFileSync(outFile, json);
  const publicDir = path.join(process.cwd(), "public", "data", "sde");
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  const publicFile = path.join(publicDir, "bundle.json");
  writeFileSync(publicFile, json);
  console.log(`Wrote ${outFile} and ${publicFile} (build ${meta.buildNumber})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
