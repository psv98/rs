# Розгортання

## 1. GitHub

```bash
git status            # переконайтеся, що немає .env, *.db, var/, backups/
git push origin main
```

CI запускає typecheck, тести, `npm audit` і збірку для кожного push і pull request.

### GitHub Pages (публічна частина)

Workflow `pages.yml` збирає статичну версію з `data/published/snapshots.json` і викладає її в гілку `gh-pages`. У Settings → Pages оберіть «Deploy from a branch», гілку `gh-pages` і папку `/ (root)`.

На Pages працює лише публічна частина: сторінки UA/EN, режим презентації, PNG і ZIP (рендеряться під час збірки). Адмін-панель на Pages не викладається: «адмінка в браузері» з паролем нічого не захищала б. Хто може змінювати дані, визначають права на запис у репозиторій; увімкніть захист гілки `main` і 2FA.

### Повна версія з адмінкою

## 2. Сервер

Потрібно: Node.js 22 LTS, PostgreSQL 14+ (або SQLite на одному сервері з постійним диском), HTTPS-проксі (Caddy або nginx). Підходить VPS, Docker-хостинг або PaaS з постійним процесом Node.

### База даних (PostgreSQL, найменші права)

```sql
CREATE ROLE imi_owner LOGIN PASSWORD '…';      -- лише для міграцій
CREATE ROLE imi_app   LOGIN PASSWORD '…';      -- для застосунку
CREATE DATABASE imi OWNER imi_owner;
```

```bash
DATABASE_URL=postgres://imi_owner:…@host/imi npm run db:migrate
```

```sql
\c imi
GRANT USAGE ON SCHEMA public TO imi_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO imi_app;
GRANT DELETE ON session, login_throttle, snapshot TO imi_app;  -- snapshot: лише чернетки (обмежено кодом)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO imi_app;
```

Права перевірено: роль `imi_app` не може видаляти таблиці й записи журналу аудиту.

### Застосунок

```bash
npm ci
npm run build
# .env на сервері:
#   SITE_URL=https://crimes.imi.org.ua
#   DATABASE_URL=postgres://imi_app:…@host/imi
#   BACKUP_DIR=/var/lib/imi/backups
#   TRUST_PROXY=1
NODE_ENV=production npm run admin:create
NODE_ENV=production npm start               # або: node .next/standalone/server.js
```

Для `output: "standalone"` скопіюйте `public/` і `.next/static/` поруч із `.next/standalone/` (стандартна схема Next.js). `assets/fonts` і `public/brand` додаються до трасування автоматично.

### Caddy (приклад)

```
crimes.imi.org.ua {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

### Копії

- Автоматичні JSON-копії: `BACKUP_DIR` (синхронізуйте їх в окреме сховище).
- PostgreSQL: щоденний `pg_dump` поза сервером.
- Відновлення: `npm run db:restore -- копія.json`.

## 3. Оновлення застосунку

```bash
git pull && npm ci && npm run build
DATABASE_URL=<owner> npm run db:migrate
# перезапустіть процес
```
