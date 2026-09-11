import type { SiteState } from "./siteState";

export function withServerTime(state: SiteState) {
  return { ...state, serverTime: new Date().toISOString() };
}
