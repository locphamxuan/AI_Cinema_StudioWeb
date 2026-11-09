# AI Cinema — Studio Web

The working portal of a **partner studio**. A studio has its own `STUDIO` account in AI Cinema and logs in here; every screen
calls the AI Cinema API with that account, so films are exchanged only inside the platform.

| Screen | What the studio does |
| --- | --- |
| Đăng nhập | Logs in with its AI Cinema account. Accounts of any other role are refused. |
| Tổng quan | Studio details, contracts waiting for it, projects in production, notifications. |
| Hợp đồng | Every round of each negotiation. Fills in the cost and signs a template, or agrees with / counters the Admin's cost. |
| Dự án | Final Script, episodes with deadlines and status, latest delivery, the Reviewer's change requests; processes a failed delivery again. |
| Nộp phim | Delivers one episode to the Reviewer (MP4/MOV file or link) with the mandatory AI Disclosure and a proposed AI label. |

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

### Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `AI_CINEMA_API_URL` | `http://localhost:3001/api` | Base URL of the AI Cinema API, with the `/api` prefix. |
| `COOKIE_SECURE` | `true` in production, otherwise `false` | Session cookies travel over https only. Set `false` to try a production build over plain http. |

## Session

The tokens live in httpOnly, SameSite=Lax cookies set by this site; page scripts never see them.

- `src/proxy.ts` swaps the refresh token for a new pair shortly before the access token expires. A refresh token works once, so
  concurrent requests share the refresh already running.
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
  components/         screens and forms
  lib/
    api/              API client, response types, film upload
    session/          cookies, rotation, session helpers for pages and mutations
    domain/           contract, episode and submission rules, Vietnamese labels
  tests/unit/         Vitest
```

## Checks

```bash
npm test          # unit and component tests
npm run lint      # includes max 300 lines per file
npm run typecheck
npm run build
```
