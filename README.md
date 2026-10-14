# AI Cinema — Studio Web

The site of the **partner studio**, a third party outside AI Cinema (BR-15, BR-58, BR-59).

- It has **no AI Cinema account** and **never calls the AI Cinema API**. The only link between the two is **email**.
- It does **not make videos**. The team prepares the films, scripts and revised versions in advance (`demo-data/`).
- Flow of the demo: the Content Creator hands a project (or a season) off in AI Cinema → AI Cinema emails the brief PDF, the
  script and the material → **this site shows the mail** in its inbox → the studio presses **Gửi lại phim** → the Creator gets an
  email with download links and the script → the Creator downloads, moves the studio milestone and uploads each episode as a
  Submission in AI Cinema.

## Run it

Needs Node.js 20.19+.

```bash
npm ci
cp .env.example .env.local     # fill in the Mailtrap settings below
npm run dev                    # http://localhost:3100
```

Without a Mailtrap account, `MAIL_SOURCE=fixtures` shows two canned briefs and sends nothing, so the screens can be tried offline.

### Mailtrap (demo)

AI Cinema (`SMTP_*` of its backend) and this site share one Mailtrap sandbox:

1. AI Cinema's backend sends the brief to the studio's address through Mailtrap's SMTP; it lands in the sandbox **inbox**.
2. This site reads that inbox through Mailtrap's API: set `MAILTRAP_API_TOKEN`, `MAILTRAP_ACCOUNT_ID`, `MAILTRAP_INBOX_ID`.
   Set `STUDIO_EMAILS` to the studio's address (the one used in AI Cinema's **Studio** catalog) to ignore other mail.
3. The reply goes out over SMTP (`SMTP_*`) to the Creator named in the brief (`Đầu mối: … — email`). In a Mailtrap sandbox
   it lands in the same inbox, where the Creator's side of the demo reads it; the site filters it out by its subject.

Put the secrets in `.env.local` (git-ignored), never in the repository.

### Access

`STUDIO_ACCESS_CODE` asks visitors for a code once (the cookie holds a hash). Leave it empty on a local machine; set it before
deploying, because the inbox shows the studio's mail.

## The prepared films (`demo-data/`)

`projects.json` maps a film title (case, accents and punctuation do not matter) to its script and its deliveries:
`v1` = first delivery, `v2` = the fixed one after the Reviewer asked for changes. A project with no entry uses `generic`,
fitted to the number of episodes ordered. Episode links default to open-licence AI films on Wikimedia Commons (the same
sources as AI_Cinema_BE's `prisma/catalog-sources.ts`); replace them with the team's own files when needed.
The file is checked on every load and a mistake names the field. Scripts live in `demo-data/scripts/`.

## Layout

```
demo-data/            prepared films (projects.json) and scripts
src/
  app/                pages and route handlers (thin)
  components/         screens: inbox, order detail, reply panel, film library
  lib/
    mail/             hand-off mail parser, Mailtrap inbox, SMTP sender, fixtures
    demo/             manifest, title matching, the mail that hands a film back
    studio.ts         use cases: list orders, open one, send a film back
    sent-log.ts       what was already sent (DATA_DIR/sent.json)
    access.ts, session.ts, config.ts
  tests/unit/         Vitest
```

## Checks

```bash
npm test          # unit and component tests
npm run lint      # includes max 300 lines per file
npm run typecheck
npm run build
```
