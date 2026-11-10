// A stand-in for the AI Cinema API, used only by the Playwright tests so they need no real backend.
// It answers the endpoints Studio Web calls with the shapes of the real API (`/api/auth/*`, `/api/studio-portal/*`,
// `/api/notifications*`), keeps its data in memory, and goes back to the seed on `POST /__test/reset`.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { seed, STUDIO_ACCOUNT } from './seed.mjs';

const PORT = Number(process.env.FAKE_API_PORT ?? 3299);

let db = seed();
const tokens = { access: new Set(), refresh: new Set() };

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
const fail = (res, status, code, message) => send(res, status, { error: { code, message } });

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text || !(req.headers['content-type'] ?? '').startsWith('application/json')) return {};
  return JSON.parse(text);
}

function issueSession() {
  const accessToken = `access-${randomUUID()}`;
  const refreshToken = `refresh-${randomUUID()}`;
  tokens.access.add(accessToken);
  tokens.refresh.add(refreshToken);
  const { id, email, fullName, role } = STUDIO_ACCOUNT;
  return { accessToken, accessTokenExpiresIn: 1800, refreshToken, user: { id, email, fullName, role, permissions: [] } };
}

const now = () => new Date().toISOString();
const withRefs = (contract) => {
  const project = db.projects.find((item) => item.id === contract.projectId);
  return { ...contract, studio: { id: db.studio.id, name: db.studio.name }, project: { id: project.id, movie: { title: project.title } } };
};
const latestRound = (projectId) =>
  db.contracts.filter((c) => c.projectId === projectId).sort((a, b) => b.round - a.round)[0];

/** Closes the current round and opens the next one, as the API does on a counter-offer. */
function openNextRound(contract, fields) {
  contract.status = 'SUPERSEDED';
  contract.updatedAt = now();
  const next = {
    ...contract,
    id: randomUUID(),
    round: contract.round + 1,
    previousId: contract.id,
    adminSignedAt: null,
    adminSignedBy: null,
    studioSignedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...fields,
  };
  db.contracts.push(next);
  return next;
}

const CONTRACT_MOVES = {
  propose: { from: 'SENT', apply: (c, cost) => Object.assign(c, { costVnd: cost, proposedBy: 'STUDIO', status: 'STUDIO_SIGNED', studioSignedAt: now() }) },
  sign: { from: 'ADMIN_COUNTERED', apply: (c) => Object.assign(c, { status: 'SIGNED', studioSignedAt: now() }) },
  counter: {
    from: 'ADMIN_COUNTERED',
    apply: (c, cost) => openNextRound(c, { costVnd: cost, proposedBy: 'STUDIO', status: 'STUDIO_SIGNED', studioSignedAt: now() }),
  },
};

function contractMove(res, contractId, move, body) {
  const contract = db.contracts.find((c) => c.id === contractId);
  if (!contract) return fail(res, 404, 'NOT_FOUND', 'Contract not found');
  const rule = CONTRACT_MOVES[move];
  if (contract.status !== rule.from) return fail(res, 409, 'CONFLICT', `The contract is ${contract.status}, it cannot ${move}`);
  const updated = rule.apply(contract, body.costVnd) ?? contract;
  updated.updatedAt = now();
  return send(res, 201, withRefs(updated));
}

function findEpisode(episodeId) {
  for (const project of db.projects) {
    const episode = project.episodes.find((item) => item.id === episodeId);
    if (episode) return { project, episode };
  }
  return null;
}

function deliver(res, episodeId, sourceMethod) {
  const found = findEpisode(episodeId);
  if (!found) return fail(res, 404, 'NOT_FOUND', 'Episode not found');
  if (latestRound(found.project.id)?.status !== 'SIGNED') return fail(res, 409, 'CONFLICT', 'The contract of this project is not signed yet');
  const version = (found.episode.latestDelivery?.version ?? 0) + 1;
  found.episode.latestDelivery = { id: randomUUID(), version, ingestStatus: 'PENDING', failureReason: null, createdAt: now(), changeRequest: null };
  found.episode.status = 'PROCESSING';
  return send(res, 201, { id: found.episode.latestDelivery.id, version, sourceMethod, ingestStatus: 'PENDING' });
}

function retry(res, mediaAssetId) {
  const found = db.projects.flatMap((p) => p.episodes).find((e) => e.latestDelivery?.id === mediaAssetId);
  if (!found) return fail(res, 404, 'NOT_FOUND', 'Media not found');
  if (found.latestDelivery.ingestStatus !== 'FAILED') return fail(res, 409, 'CONFLICT', 'Only a failed delivery can be processed again');
  Object.assign(found.latestDelivery, { ingestStatus: 'PENDING', failureReason: null });
  return send(res, 200, { ...found.latestDelivery, episodeId: found.id });
}

const projectSummary = (project) => {
  const contract = latestRound(project.id);
  const { id, status, handedOffAt, title, episodes } = project;
  return { id, status, handedOffAt, title, episodeCount: episodes.length, contract: contract ? { id: contract.id, status: contract.status, costVnd: contract.costVnd } : null };
};
const projectDetail = (project) => ({
  ...project,
  contracts: db.contracts.filter((c) => c.projectId === project.id).sort((a, b) => a.round - b.round),
});

async function route(req, res) {
  const url = new URL(req.url, 'http://fake');
  const path = url.pathname.replace(/^\/api/, '');
  const method = req.method;
  const body = await readJson(req);

  if (method === 'GET' && path === '/__health') return send(res, 200, { ok: true });
  if (method === 'POST' && path === '/__test/reset') {
    db = seed();
    return send(res, 204);
  }
  if (method === 'POST' && path === '/auth/login') {
    const ok = body.email === STUDIO_ACCOUNT.email && body.password === STUDIO_ACCOUNT.password;
    return ok ? send(res, 200, issueSession()) : fail(res, 401, 'UNAUTHORIZED', 'Invalid email or password');
  }
  if (method === 'POST' && path === '/auth/refresh') {
    if (!tokens.refresh.delete(body.refreshToken)) return fail(res, 401, 'UNAUTHORIZED', 'Invalid refresh token');
    return send(res, 200, issueSession());
  }
  if (method === 'POST' && path === '/auth/logout') {
    tokens.refresh.delete(body.refreshToken);
    return send(res, 204);
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!tokens.access.has(token)) return fail(res, 401, 'UNAUTHORIZED', 'Invalid token');

  let match;
  if (method === 'GET' && path === '/studio-portal/me') return send(res, 200, db.studio);
  if (method === 'GET' && path === '/studio-portal/contracts') {
    return send(res, 200, [...db.contracts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(withRefs));
  }
  if (method === 'POST' && (match = path.match(/^\/studio-portal\/contracts\/([^/]+)\/(propose|sign|counter)$/))) {
    return contractMove(res, match[1], match[2], body);
  }
  if (method === 'GET' && path === '/studio-portal/projects') return send(res, 200, db.projects.map(projectSummary));
  if (method === 'GET' && (match = path.match(/^\/studio-portal\/projects\/([^/]+)$/))) {
    const project = db.projects.find((item) => item.id === match[1]);
    return project ? send(res, 200, projectDetail(project)) : fail(res, 404, 'NOT_FOUND', 'Project not found');
  }
  if (method === 'POST' && (match = path.match(/^\/studio-portal\/episodes\/([^/]+)\/media(\/upload)?$/))) {
    return deliver(res, match[1], match[2] ? 'UPLOAD' : body.sourceMethod);
  }
  if (method === 'POST' && (match = path.match(/^\/studio-portal\/media-assets\/([^/]+)\/retry$/))) return retry(res, match[1]);
  if (method === 'GET' && path === '/notifications') {
    const limit = Number(url.searchParams.get('limit') ?? 20);
    return send(res, 200, { data: db.notifications.slice(0, limit), meta: { itemsPerPage: limit, totalItems: db.notifications.length, currentPage: 1, totalPages: 1 } });
  }
  if (method === 'PATCH' && path === '/notifications/read-all') {
    const unread = db.notifications.filter((item) => !item.readAt);
    for (const item of unread) item.readAt = now();
    return send(res, 200, { updated: unread.length });
  }
  return fail(res, 404, 'NOT_FOUND', `No fake route for ${method} ${path}`);
}

createServer((req, res) => {
  route(req, res).catch((error) => fail(res, 500, 'INTERNAL', String(error)));
}).listen(PORT, () => console.log(`fake AI Cinema API on http://localhost:${PORT}/api`));
