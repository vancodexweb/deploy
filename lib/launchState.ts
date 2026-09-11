import { promises as fs } from "fs";
import path from "path";

export type LaunchState = {
  launchAt: string;
  frozen: boolean;
};

const DATA_DIR = process.env.LAUNCH_STATE_DIR || path.join(process.cwd(), ".data");
const STATE_PATH = path.join(DATA_DIR, "launch-state.json");

const DEFAULT_LAUNCH_OFFSET_MS = 30 * 24 * 60 * 60 * 1000;

function defaultState(): LaunchState {
  return {
    launchAt: new Date(Date.now() + DEFAULT_LAUNCH_OFFSET_MS).toISOString(),
    frozen: false,
  };
}

export async function readLaunchState(): Promise<LaunchState> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.launchAt === "string" && typeof parsed.frozen === "boolean") {
      return parsed;
    }
  } catch {
    // no state file yet — fall back to default below
  }
  return defaultState();
}

export async function writeLaunchState(state: LaunchState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}
