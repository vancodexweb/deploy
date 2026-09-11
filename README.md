# Форма обратной связи

Next.js 16 + Bootstrap. Заявки с формы (имя, Telegram/телефон, сообщение, срок связи)
уходят в Telegram-бот. Проект контейнеризован (Docker) и настроен на авто-деплой через
GitHub Actions при пуше в `main`, с автоматическим nginx-проксированием и SSL через
nginx-proxy + Let's Encrypt. Живой сайт: https://vancodex.tech

## Локальная разработка

```bash
npm install
cp .env.example .env   # впишите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

## Локальная сборка в Docker

```bash
cp .env.example .env
docker build -t feedback-app .
docker run --rm -p 3000:3000 --env-file .env feedback-app
```

## Деплой на сервер

Полная инструкция (первичная настройка сервера, nginx-proxy, SSL, GitHub Actions) —
в [DEPLOY.md](./DEPLOY.md).
