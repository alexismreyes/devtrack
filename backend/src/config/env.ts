import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function loadEnvFiles(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false });
    }
  }

  // Host/tests fallback when Compose env is not injected (Q-131).
  if (
    process.env.ATTACHMENTS_ROOT === undefined ||
    process.env.ATTACHMENTS_ROOT.trim() === ""
  ) {
    process.env.ATTACHMENTS_ROOT = "./data/attachments";
  }
}
