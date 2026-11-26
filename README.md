# AI Cinema — Studio Web

The working portal of a **partner studio**. A studio has its own `STUDIO` account in AI Cinema and logs in here; every screen
calls the AI Cinema API with that account, so films are exchanged only inside the platform.

| Screen | What the studio does |
| --- | --- |
| Đăng nhập | Email and password of the STUDIO account the Admin created, on this site, in the same tab (`POST /auth/login`); any other role is refused and its session revoked. |
| Tổng quan | Studio details, contracts waiting for it, projects in production, notifications. |
| Hợp đồng | Sub-tabs Cần ký / Chờ Admin ký / Đã ký đủ / Lịch sử báo giá, paged. Downloads the unsigned contract the system generates once the Admin approves the Final Script (film, episodes, deadlines, budget), then signs it by uploading a signature image (PNG/JPG, at most 2 MB, previewed first): at the budget, or at a lower cost. Agrees with / counters the Admin's cost the same way. The system draws each signature into the same contract, so the Admin-signed, studio-signed and FINAL copies have the layout of the unsigned one. Signing needs a complete legal profile. |
| Hồ sơ pháp lý | The studio fills in its own Bên B (address, tax code, bank account and bank, title of the representative); name, contract email, representative and phone stay with the Admin. |
| Dự án | Final Script, episodes with deadlines and status, latest delivery, the Reviewer's change requests; processes a failed delivery again. |
| Nộp phim | Delivers one episode to the Reviewer (MP4/MOV file or link) with the mandatory AI Disclosure and a proposed AI label. |

Signing a contract round, delivering a film and processing a failed delivery again each open a confirmation that repeats
what will be sent (cost, PDF, file or link, proposed label). The browser checks the same limits as the API first: the signed
PDF at most 10 MB, a film MP4/MOV up to 2 GB (`MEDIA_MAX_UPLOAD_MB` default), an http(s) link of at most 1000 characters,
an `.m3u8` playlist for HLS.

A film can be delivered only once the contract carries both signatures and the episode is `AWAITING_MEDIA`, `IN_REVIEW` or
`CHANGES_REQUESTED`. The API enforces this too and its errors are shown as they come.

## Run it

Needs Node.js 20.19+ and a running AI Cinema API (`AI-_Cinema_BE`, seeded).

```bash
npm ci
cp .env.example .env.local
npm run dev                    # http://localhost:3100
```

Demo account created by the backend seed: `studio@aicinema.com` / `Aicinema@123` (studio "Lumen Studio"). The seed creates no
contract: the Admin has to approve the Final Script of a project assigned to this studio before one appears here.

### Docker

`Dockerfile` builds the production image (Next.js standalone output, port 3100) and `docker-compose.yml` runs it:

```bash
docker compose up -d --build    # http://localhost:3100
docker compose logs -f studio-web
docker compose down
```

Compose reads `.env` for the settings below. They are runtime values, so after editing `.env` a plain `docker compose up -d`
is enough — only a new image needs `--build`. Two addresses differ inside a container:

- `DOCKER_API_URL` is the API as seen from the container; the default `http://host.docker.internal:3001/api` reaches an API
  started on the host (`docker compose up -d --build` in `AI_Cinema_BE`, or `npm run start:local`). When the API is a
  container on a shared network, set e.g. `DOCKER_API_URL=http://api:3001/api` and attach this service to that network
  (see the commented block in `docker-compose.yml`).
- `STUDIO_WEB_URL` is what the browser uses, not what the container dials: `STUDIO_WEB_URL/api/auth/callback` must be
  registered in the API's `OAUTH_STUDIO_WEB_REDIRECT_URIS`.

Set `COOKIE_SECURE=false` when the site is served over plain http from another machine than localhost.

### Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `AI_CINEMA_API_URL` | `http://localhost:3001/api` | Base URL of the AI Cinema API, with the `/api` prefix. |
| `COOKIE_SECURE` | `true` in production, otherwise `false` | Session cookies travel over https only. Set `false` to try a production build over plain http. |

## Session

The tokens live in httpOnly, SameSite=Lax cookies set by this site; page scripts never see them.

- The login form is a Server Action: it calls `/auth/login`, keeps STUDIO accounts only and writes the session cookies; logout
  calls `/auth/logout`.
- `src/proxy.ts` swaps the refresh token for a new pair shortly before the access token expires. A refresh token works once, so
  concurrent requests share the refresh already running.
- When the API refuses the token, pages, Server Actions and the PDF download end the session and open
  `/login?expired=1`; the film form does the same on a 401 from the upload route.
- Server Actions and the upload route refresh the same way. The upload route is outside the proxy, because the proxy would buffer
  the body; it streams the file straight to the API.

## Layout

```
src/
  proxy.ts            session check and token rotation
  app/
    login/            login page
    (portal)/         overview, contracts, projects, film delivery
    actions/          Server Actions: login, logout, contract moves, notifications
    api/episodes/     route handler that forwards a film to the API
    api/contracts/    downloads a signed contract PDF with the session's token
  components/         screens and forms
  lib/
    api/              API client, response types, film upload
    session/          cookies, rotation, session helpers for pages and mutations, per-request portal data
    domain/           contract, episode and submission rules, Vietnamese labels
  tests/unit/         Vitest
e2e/                  Playwright tests and the fake API they run against
```

## Checks

```bash
npm test          # unit and component tests
npm run lint      # includes max 300 lines per file
npm run typecheck
npm run build
```

### End-to-end tests

`npm run test:e2e` builds the site, starts it on port 3200 against a fake AI Cinema API (`e2e/fake-api`, port 3299) and runs
the Playwright tests in Chromium, so no backend is needed. The fake answers with the shapes of the real API, keeps its data in
memory and goes back to its seed before each test. Install the browser once with `npx playwright install chromium`.
