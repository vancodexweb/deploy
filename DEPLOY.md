# Деплой на сервер

Домен: `vancodex.tech`. Схема: `git push` в GitHub (`origin`, ветка `main`) → GitHub Actions
сам по SSH подключается к серверу, синхронизирует код и пересобирает Docker-контейнер →
nginx-proxy автоматически подхватывает контейнер, проксирует на него домен и выпускает
SSL-сертификат Let's Encrypt. Заходить на сервер после первичной настройки не нужно.

Для того чтобы в будущем разворачивать другие проекты без конфликтов в nginx, используется
готовая связка **nginx-proxy + acme-companion**: она сама генерирует конфиг nginx и
сертификат для каждого контейнера на основе его переменных окружения (`VIRTUAL_HOST`,
`LETSENCRYPT_HOST`). Ручной nginx.conf трогать не придётся — просто поднимаете новый
проект в своём docker-compose с нужным `VIRTUAL_HOST` и подключаете его к сети `nginx-proxy`.

## 0. Что должно быть на сервере

- Docker + плагин Docker Compose (`docker compose version`).
- Открытые порты 80 и 443.
- DNS: A-запись `vancodex.tech` (и при необходимости `www.vancodex.tech`) указывает на IP сервера.

## 1. Разовая настройка reverse-proxy + SSL (infra/)

Выполняется один раз на сервере, потом переиспользуется для всех будущих проектов.

```bash
mkdir -p /opt/infra
# скопируйте на сервер содержимое папки infra/ из репозитория в /opt/infra
cd /opt/infra
cp .env.example .env
# впишите в .env реальный email (DEFAULT_EMAIL) — на него Let's Encrypt шлёт уведомления
docker compose up -d
```

Это поднимет:
- `nginx-proxy` — слушает 80/443, проксирует запросы на нужный контейнер по `VIRTUAL_HOST`;
- `acme-companion` — сам запрашивает и продлевает сертификаты Let's Encrypt для доменов,
  у которых указан `LETSENCRYPT_HOST`.

Сеть `nginx-proxy` создаётся автоматически (`external: true` в остальных compose-файлах
ссылается именно на неё).

## 2. Telegram-бот

1. В Telegram напишите **@BotFather** → `/newbot`, получите `TELEGRAM_BOT_TOKEN`.
2. Напишите новому боту любое сообщение (или добавьте в группу/канал).
3. Узнайте `chat_id`:
   - откройте `https://api.telegram.org/bot<TOKEN>/getUpdates` после того как написали боту;
   - в ответе найдите `"chat":{"id":...}` — это и есть `TELEGRAM_CHAT_ID`
     (для личных сообщений — положительное число, для групп — отрицательное).

### Управление плашкой запуска из бота

На сайте есть плашка "До открытия проекта" с обратным отсчётом. Ей можно управлять прямо
из Telegram — бот принимает команды (только от `TELEGRAM_CHAT_ID`, все остальные отправители
игнорируются):

- `/status` — текущая дата запуска и статус
- `/postpone 2d` — отложить запуск (`2d` / `12h` / `30m`)
- `/reduce 2d` — приблизить запуск
- `/setdate 2026-10-01 12:00` — задать точную дату (время указывается по МСК)
- `/freeze` — приостановить обратный отсчёт (на сайте покажется статичная плашка
  "Дата запуска уточняется" вместо тикающего таймера)
- `/unfreeze` — возобновить отсчёт

Для приёма команд боту нужен **webhook**, а не обычный `getUpdates`. Нужно один раз:

1. Сгенерировать секрет: `openssl rand -hex 24` — вписать его в `.env` на сервере как
   `TELEGRAM_WEBHOOK_SECRET`.
2. Зарегистрировать webhook (после того как сайт задеплоен и доступен по HTTPS):
   ```bash
   curl -s -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://vancodex.tech/api/telegram-webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
   ```
   Telegram будет присылать каждое сообщение боту на `/api/telegram-webhook` с заголовком
   `X-Telegram-Bot-Api-Secret-Token` — без правильного секрета запрос отклоняется (401).

Состояние (дата запуска, флаг паузы) хранится в файле на Docker-томе `feedback-app-launch-data`,
поэтому переживает передеплой и пересборку контейнера.

## 3. Рабочая директория на сервере

```bash
mkdir -p /opt/apps/feedback-app
```

Создайте `/opt/apps/feedback-app/.env` вручную (возьмите за основу `.env.example` из
репозитория) и впишите туда реальные `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, а также:

```
VIRTUAL_HOST=vancodex.tech
LETSENCRYPT_HOST=vancodex.tech
LETSENCRYPT_EMAIL=you@example.com
```

Этот файл GitHub Actions не трогает (исключён из синхронизации), поэтому реальные секреты
никогда не попадают в git и в логи CI.

## 4. GitHub Actions (авто-деплой по `git push`)

Workflow уже лежит в [.github/workflows/deploy.yml](.github/workflows/deploy.yml): при пуше
в `main` он по SSH синхронизирует код на сервер (`rsync`, без `.git`/`.env`/`node_modules`) и
выполняет `docker compose build && docker compose up -d` в `/opt/apps/feedback-app`.

Нужно один раз:

1. Сгенерировать отдельный SSH-ключ для CI (не тот, что используется для ручного захода на
   сервер) и добавить его публичную часть в `~/.ssh/authorized_keys` на сервере (от пользователя,
   под которым будет разворачиваться сайт).
2. В репозитории на GitHub: **Settings → Secrets and variables → Actions → New repository
   secret** — добавить три секрета:
   - `SSH_HOST` — IP или домен сервера;
   - `SSH_USER` — пользователь для SSH (например `root`);
   - `SSH_KEY` — содержимое приватного ключа из шага 1 целиком (вместе со строками
     `-----BEGIN...-----` / `-----END...-----`).
3. Запушить в `main` (или вручную перезапустить последний workflow run во вкладке **Actions**,
   если секреты добавлены уже после первого пуша).

## 5. Как это работает дальше

Любой следующий `git push origin main` автоматически:
1. синхронизирует код на сервер по SSH (`rsync --delete`, старые файлы, которых больше нет в
   репозитории, тоже удаляются — кроме `.env`);
2. пересобирает Docker-образ (`docker compose build`);
3. перезапускает контейнер (`docker compose up -d`) без даунтайма для остальных проектов;
4. чистит неиспользуемые старые образы.

### Альтернатива: прямой push на сервер

В репозитории также настроен git-хук [deploy/post-receive](deploy/post-receive) для деплоя
без GitHub — прямым `git push` на bare-репозиторий сервера (`git remote add production
ssh://user@host/opt/git/feedback-app.git`). Он не обязателен при использовании GitHub Actions,
но оставлен как рабочий резервный способ деплоя, если понадобится задеплоить не пушая в GitHub.

## 6. Как добавить ещё один проект в будущем без конфликтов

1. У нового проекта — свой `docker-compose.yml` с уникальным `container_name` и своим
   `VIRTUAL_HOST` (например `another.vancodex.tech` или другой домен).
2. Контейнер подключается к уже существующей внешней сети `nginx-proxy` (как в
   `docker-compose.yml` этого проекта).
3. `nginx-proxy` и `acme-companion` сами увидят новый контейнер, сгенерируют для него
   конфиг и сертификат — существующие проекты это не затронет.

## Полезные команды на сервере

```bash
docker ps                                   # какие контейнеры запущены
docker logs -f feedback-app                 # логи приложения
docker logs -f nginx-proxy                  # логи reverse-proxy
docker logs -f nginx-proxy-acme             # логи выпуска SSL
cd /opt/apps/feedback-app && docker compose logs -f
```
