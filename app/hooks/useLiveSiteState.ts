"use client";

import { useEffect, useRef, useState } from "react";

export type Banner = { title: string; message: string } | null;

export type SiteState = {
  launchAt: string;
  frozen: boolean;
  banner: Banner;
};

export type SiteStatePayload = SiteState & { serverTime: string };

export function useLiveSiteState(initial: SiteStatePayload) {
  const [state, setState] = useState<SiteState>(initial);
  const offsetRef = useRef(0);
  const [now, setNow] = useState<number>(() => new Date(initial.serverTime).getTime());

  useEffect(() => {
    offsetRef.current = new Date(initial.serverTime).getTime() - Date.now();
    setNow(Date.now() + offsetRef.current);

    const tick = setInterval(() => {
      setNow(Date.now() + offsetRef.current);
    }, 1000);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.onmessage = (event) => {
      try {
        const payload: SiteStatePayload = JSON.parse(event.data);
        offsetRef.current = new Date(payload.serverTime).getTime() - Date.now();
        setState({
          launchAt: payload.launchAt,
          frozen: payload.frozen,
          banner: payload.banner,
        });
        setNow(Date.now() + offsetRef.current);
      } catch {
        // ignore malformed payloads
      }
    };

    return () => source.close();
  }, []);

  return { state, now };
}
