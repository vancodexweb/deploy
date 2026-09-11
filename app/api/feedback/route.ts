import { NextResponse } from "next/server";

const MAX_MESSAGE_LENGTH = 4000;

type FeedbackPayload = {
  name?: string;
  contact?: string;
  message?: string;
  contactWindow?: string;
  website?: string;
};

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
    return NextResponse.json(
      { error: "Сервис временно недоступен" },
      { status: 500 }
    );
  }

  let body: FeedbackPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name || "").trim().slice(0, 200);
  const contact = (body.contact || "").trim().slice(0, 200);
  const message = (body.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
  const contactWindow = (body.contactWindow || "").trim().slice(0, 100);

  if (!name || !contact || !message) {
    return NextResponse.json(
      { error: "Заполните имя, контакт и сообщение" },
      { status: 400 }
    );
  }

  const text = [
    "📩 Новая заявка с сайта",
    `Имя: ${name}`,
    `Контакт: ${contact}`,
    contactWindow ? `Срок связи: ${contactWindow}` : null,
    "",
    message,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );

  if (!telegramResponse.ok) {
    const errorBody = await telegramResponse.text();
    console.error("Telegram API error:", errorBody);
    return NextResponse.json(
      { error: "Не удалось отправить заявку" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
