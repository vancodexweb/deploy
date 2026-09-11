"use client";

import { useLiveSiteState, type SiteStatePayload } from "../hooks/useLiveSiteState";

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

export default function LiveSite({ initial }: { initial: SiteStatePayload }) {
  const { state, now } = useLiveSiteState(initial);
  const remaining = new Date(state.launchAt).getTime() - now;
  const launched = remaining <= 0;
  const { days, hours, minutes, seconds } = getParts(remaining);

  return (
    <>
      {state.banner && (
        <div className="announcement mb-4">
          <div className="announcement__title">{state.banner.title}</div>
          <div className="announcement__message">{state.banner.message}</div>
        </div>
      )}

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
    </>
  );
}
