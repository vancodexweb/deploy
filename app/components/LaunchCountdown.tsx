"use client";

import { useEffect, useState } from "react";

type LaunchState = {
  launchAt: string;
  frozen: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getParts(ms: number) {
  const clamped = Math.max(ms, 0);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function LaunchCountdown({ initial }: { initial: LaunchState }) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const sync = () => {
      fetch("/api/launch-state", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setState(data);
        })
        .catch(() => {});
    };
    const poll = setInterval(sync, 30_000);
    return () => clearInterval(poll);
  }, []);

  const remaining = new Date(state.launchAt).getTime() - now;
  const launched = remaining <= 0;
  const { days, hours, minutes, seconds } = getParts(remaining);

  return (
    <div className="launch-badge mb-4">
      {state.frozen ? (
        <>
          <div className="launch-badge__label">Дата запуска уточняется</div>
          <div className="launch-badge__sub">Отсчёт временно приостановлен</div>
        </>
      ) : launched ? (
        <div className="launch-badge__label">Проект уже открыт</div>
      ) : (
        <>
          <div className="launch-badge__label">До открытия проекта</div>
          <div className="launch-badge__timer">
            <span>
              {days}
              <em>дн</em>
            </span>
            <span>
              {pad(hours)}
              <em>ч</em>
            </span>
            <span>
              {pad(minutes)}
              <em>мин</em>
            </span>
            <span>
              {pad(seconds)}
              <em>сек</em>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
