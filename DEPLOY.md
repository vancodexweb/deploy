# Деплой на сервер

Домен: `vancodex.tech`. Схема: `git push` прямо на сервер → git-хук сам пересобирает и
перезапускает Docker-контейнер → nginx-proxy автоматически подхватывает контейнер,
проксирует на него домен и выпускает SSL-сертификат Let's Encrypt. Заходить на сервер
после первичной настройки не нужно.

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

## 3. Bare-репозиторий на сервере (авто-деплой по `git push`)

```bash
mkdir -p /opt/git/feedback-app.git
cd /opt/git/feedback-app.git
git init --bare

mkdir -p /opt/apps/feedback-app
```

Скопируйте на сервер файл `deploy/post-receive` из репозитория в
`/opt/git/feedback-app.git/hooks/post-receive` и сделайте его исполняемым:

```bash
chmod +x /opt/git/feedback-app.git/hooks/post-receive
```

Проверьте пути `WORK_TREE` и `GIT_DIR_PATH` внутри хука — они должны совпадать с путями выше
(`/opt/apps/feedback-app` и `/opt/git/feedback-app.git`).

Хук проверяет наличие `.env` перед каждым деплоем и остановится с ошибкой, если его нет.
Создайте `/opt/apps/feedback-app/.env` вручную (возьмите за основу `.env.example` из
репозитория) и впишите туда реальные `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, а также:

```
VIRTUAL_HOST=vancodex.tech
LETSENCRYPT_HOST=vancodex.tech
LETSENCRYPT_EMAIL=you@example.com
```

## 4. Локально: добавляем сервер как git remote и пушим

```bash
git remote add production ssh://USER@SERVER_IP/opt/git/feedback-app.git
git push production main
```

Хук `post-receive` на сервере сам сделает `git checkout`, `docker compose build`,
`docker compose up -d` и подчистит старые образы. Заходить на сервер не нужно — весь вывод
сборки вы увидите прямо в терминале после `git push`.

Через несколько секунд после первого пуша `acme-companion` выпустит SSL-сертификат для
`vancodex.tech`, и сайт станет доступен по `https://vancodex.tech`.

## 5. Как это работает дальше

Любой следующий `git push production main` автоматически:
1. обновляет код в `/opt/apps/feedback-app` на сервере;
2. пересобирает Docker-образ (`docker compose build`);
3. перезапускает контейнер (`docker compose up -d`) без даунтайма для остальных проектов;
4. чистит неиспользуемые старые образы.

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
