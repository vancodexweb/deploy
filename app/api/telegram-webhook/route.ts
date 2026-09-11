import { NextResponse } from "next/server";
import { readLaunchState, writeLaunchState } from "@/lib/launchState";

export const dynamic = "force-dynamic";

const UNIT_MS: Record<string, number> = {
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
};

function parseDuration(input: string): number | null {
  const match = input.trim().match(/^(\d+)\s*([mhd])$/i);
  if (!match) return null;
  return Number(match[1]) * UNIT_MS[match[2].toLowerCase()];
}

function parseSetDate(input: string): Date | null {
  const trimmed = input.trim();

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (match) {
    const [, y, mo, d, h, mi] = match;
    const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:00+03:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "уже наступила";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} д`);
  if (hours) parts.push(`${hours} ч`);
  parts.push(`${minutes} мин`);
  return parts.join(" ");
}

function formatMoscow(date: Date): string {
  return `${new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)} (МСК)`;
}

async function sendMessage(botToken: string, chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

const HELP_TEXT = [
  "Команды управления запуском:",
  "/status — текущая дата запуска и статус",
  "/postpone 2d — отложить запуск (пример: 2d / 12h / 30m)",
  "/reduce 2d — приблизить запуск",
  "/setdate 2026-10-01 12:00 — задать точную дату (время МСК)",
  "/freeze — приостановить обратный отсчёт на сайте",
  "/unfreeze — возобновить отсчёт",
].join("\n");

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_CHAT_ID;
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!botToken || !adminChatId || !expectedSecret) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: { message?: { chat?: { id?: number | string }; text?: string } };
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text;

  if (!chatId || !text || String(chatId) !== String(adminChatId)) {
    return NextResponse.json({ ok: true });
  }

  const [command, ...rest] = text.trim().split(/\s+/);
  const arg = rest.join(" ");
  const state = await readLaunchState();

  switch (command) {
    case "/postpone": {
      const delta = parseDuration(arg);
      if (delta === null) {
        await sendMessage(botToken, chatId, "Формат: /postpone 2d, /postpone 12h, /postpone 30m");
        break;
      }
      state.launchAt = new Date(new Date(state.launchAt).getTime() + delta).toISOString();
      await writeLaunchState(state);
      await sendMessage(botToken, chatId, `Дата запуска перенесена: ${formatMoscow(new Date(state.launchAt))}`);
      break;
    }
    case "/reduce": {
      const delta = parseDuration(arg);
      if (delta === null) {
        await sendMessage(botToken, chatId, "Формат: /reduce 2d, /reduce 12h, /reduce 30m");
        break;
      }
      state.launchAt = new Date(new Date(state.launchAt).getTime() - delta).toISOString();
      await writeLaunchState(state);
      await sendMessage(botToken, chatId, `Дата запуска приближена: ${formatMoscow(new Date(state.launchAt))}`);
      break;
    }
    case "/setdate": {
      const date = parseSetDate(arg);
      if (!date) {
        await sendMessage(botToken, chatId, "Формат: /setdate 2026-10-01 12:00 (время МСК) или ISO с таймзоной");
        break;
      }
      state.launchAt = date.toISOString();
      await writeLaunchState(state);
      await sendMessage(botToken, chatId, `Дата запуска установлена: ${formatMoscow(date)}`);
      break;
    }
    case "/freeze": {
      state.frozen = true;
      await writeLaunchState(state);
      await sendMessage(botToken, chatId, "Отсчёт приостановлен — на сайте покажется статичная плашка.");
      break;
    }
    case "/unfreeze": {
      state.frozen = false;
      await writeLaunchState(state);
      await sendMessage(botToken, chatId, `Отсчёт возобновлён. Дата запуска: ${formatMoscow(new Date(state.launchAt))}`);
      break;
    }
    case "/status": {
      const remaining = new Date(state.launchAt).getTime() - Date.now();
      await sendMessage(
        botToken,
        chatId,
        [
          `Дата запуска: ${formatMoscow(new Date(state.launchAt))}`,
          `Осталось: ${formatRemaining(remaining)}`,
          `Отсчёт: ${state.frozen ? "⏸ приостановлен" : "▶ идёт"}`,
        ].join("\n")
      );
      break;
    }
    case "/start":
    case "/help": {
      await sendMessage(botToken, chatId, HELP_TEXT);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
