import { promises as fs } from "fs";
import path from "path";

export type Banner = {
  title: string;
  message: string;
};

export type SiteState = {
  launchAt: string;
  frozen: boolean;
  banner: Banner | null;
};

const DATA_DIR = process.env.LAUNCH_STATE_DIR || path.join(process.cwd(), ".data");
const STATE_PATH = path.join(DATA_DIR, "site-state.json");

const DEFAULT_LAUNCH_OFFSET_MS = 30 * 24 * 60 * 60 * 1000;

function defaultState(): SiteState {
  return {
    launchAt: new Date(Date.now() + DEFAULT_LAUNCH_OFFSET_MS).toISOString(),
    frozen: false,
    banner: null,
  };
}

export async function readSiteState(): Promise<SiteState> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.launchAt === "string" && typeof parsed.frozen === "boolean") {
      return {
        launchAt: parsed.launchAt,
        frozen: parsed.frozen,
        banner: parsed.banner ?? null,
      };
    }
  } catch {
    // no state file yet — fall back to default below
  }
  return defaultState();
}

export async function writeSiteState(state: SiteState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}
