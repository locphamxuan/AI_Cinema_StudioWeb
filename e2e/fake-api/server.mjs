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

/** JSON or multipart (signature image + costVnd) bodies, read loosely as the tests need. */
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  const type = req.headers['content-type'] ?? '';
  if (!text) return {};
  if (type.startsWith('application/json')) return JSON.parse(text);
  if (type.startsWith('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
  if (type.startsWith('multipart/form-data')) {
    const cost = text.match(/name="costVnd"\r\n\r\n(\d+)/);
    const file = text.match(/name="file"; filename="([^"]+)"/);
    return { costVnd: cost ? Number(cost[1]) : undefined, fileName: file?.[1] };
  }
  return {};
}

const PDF = '%PDF-1.4\n% fake signed contract\n%%EOF';

/** The contract number the API prints on a round and puts in each of its file names. */
const contractNo = (c) => `AIC-${new Date(c.createdAt).getUTCFullYear()}-${c.id.slice(0, 8).toUpperCase()}-R${c.round}`;
const COPY_NAMES = { ADMIN: 'hop-dong-ai-cinema-da-ky', STUDIO: 'hop-dong-studio-da-ky', FINAL: 'hop-dong-du-chu-ky' };

const LEGAL_FIELDS = ['address', 'taxCode', 'bankAccount', 'bankName', 'representativeTitle'];
/** GET /studio-portal/profile: the studio with what still blocks signing, as the real API answers it. */
function profileView() {
  const missing = [...LEGAL_FIELDS, 'contactName'].filter((field) => !db.studio[field]);
  return { ...db.studio, missing, complete: missing.length === 0 };
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
  // Without a cost the studio signs at the budget printed on the contract, as the real API does.
  propose: { from: 'SENT', apply: (c, cost) => Object.assign(c, { costVnd: cost ?? c.budgetVnd, proposedBy: 'STUDIO', status: 'STUDIO_SIGNED', studioSignedAt: now() }) },
  sign: {
    from: 'ADMIN_COUNTERED',
    apply: (c) => {
      c.documents = [...(c.documents ?? []), document('FINAL', c)];
      return Object.assign(c, { status: 'SIGNED', studioSignedAt: now() });
    },
  },
  counter: {
    from: 'ADMIN_COUNTERED',
    apply: (c, cost) => openNextRound(c, { costVnd: cost, proposedBy: 'STUDIO', status: 'STUDIO_SIGNED', studioSignedAt: now() }),
  },
};

function document(side, contract) {
  const fileName = `${COPY_NAMES[side]}-${contractNo(contract)}.pdf`;
  return { id: randomUUID(), side, fileName, sizeBytes: PDF.length, checksum: 'fake', uploadedAt: now() };
}

function contractMove(res, contractId, move, body) {
  const contract = db.contracts.find((c) => c.id === contractId);
  if (!contract) return fail(res, 404, 'NOT_FOUND', 'Contract not found');
  if (!/\.(png|jpe?g)$/i.test(body.fileName ?? '')) {
    return fail(res, 400, 'BAD_REQUEST', 'Attach the signature image (PNG or JPEG) in the "file" field');
  }
  const rule = CONTRACT_MOVES[move];
  if (contract.status !== rule.from) {
    const verb = move === 'counter' ? 'answer with another price' : 'sign';
    return fail(res, 409, 'CONFLICT', `Cannot ${verb} a contract that is ${contract.status} (expected ${rule.from})`);
  }
  if (move === 'counter' && body.costVnd === contract.costVnd) {
    return fail(res, 400, 'BAD_REQUEST', 'The new cost is the same as the cost of this round; sign the round instead');
  }
  const { missing } = profileView();
  if (missing.length) {
    const message = `The studio legal profile is incomplete (${missing.join(', ')}); complete it before signing the contract`;
    return send(res, 409, { error: { code: 'CONFLICT', message, details: { reason: 'STUDIO_PROFILE_INCOMPLETE', missing } } });
  }
  // A round the Admin signed before signature images: nothing to draw beside the studio's signature.
  if (move === 'sign' && contract.missingSignature) {
    const message = "The other side's signature image of this round is missing; the round must be sent again";
    return send(res, 409, { error: { code: 'CONFLICT', message, details: { reason: 'COUNTERPART_SIGNATURE_MISSING' } } });
  }
  const updated = rule.apply(contract, body.costVnd) ?? contract;
  updated.documents = [...(updated.documents ?? []).filter((d) => d.side !== 'STUDIO'), document('STUDIO', updated)];
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
  const body = await readBody(req);

  let match;
  if (method === 'GET' && path === '/__health') return send(res, 200, { ok: true });
  if (method === 'POST' && path === '/__test/reset') {
    db = seed();
    return send(res, 204);
  }
  // What the Admin does on its own portal while the studio is on a page: move a round on, or notify the studio.
  if (method === 'POST' && (match = path.match(/^\/__test\/contracts\/([^/]+)$/))) {
    Object.assign(db.contracts.find((c) => c.id === match[1]), body, { updatedAt: now() });
    return send(res, 204);
  }
  if (method === 'POST' && path === '/__test/profile') {
    Object.assign(db.studio, body);
    return send(res, 204);
  }
  if (method === 'POST' && path === '/__test/notifications') {
    for (let n = 1; n <= body.count; n += 1) {
      db.notifications.unshift({ id: randomUUID(), type: 'CONTRACT_UPDATED', title: `Thông báo thử ${n}`, body: null, link: '/projects', readAt: null, createdAt: now() });
    }
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

  if (method === 'GET' && path === '/studio-portal/me') return send(res, 200, db.studio);
  if (method === 'GET' && path === '/studio-portal/profile') return send(res, 200, profileView());
  if (method === 'PUT' && path === '/studio-portal/profile') {
    for (const field of LEGAL_FIELDS) db.studio[field] = body[field];
    return send(res, 200, profileView());
  }
  if (method === 'GET' && path === '/studio-portal/contracts') {
    return send(res, 200, [...db.contracts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(withRefs));
  }
  if (method === 'POST' && (match = path.match(/^\/studio-portal\/contracts\/([^/]+)\/(propose|sign|counter)$/))) {
    return contractMove(res, match[1], match[2], body);
  }
  if (method === 'GET' && (match = path.match(/^\/studio-portal\/contracts\/([^/]+)\/template$/))) {
    if (!db.contracts.some((c) => c.id === match[1])) return fail(res, 404, 'NOT_FOUND', 'Contract not found');
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="hop-dong-chua-ky-${contractNo(db.contracts.find((c) => c.id === match[1]))}.pdf"` });
    return res.end(PDF);
  }
  if (method === 'GET' && (match = path.match(/^\/studio-portal\/contracts\/([^/]+)\/documents\/(ADMIN|STUDIO|FINAL)\/content$/))) {
    const doc = db.contracts.find((c) => c.id === match[1])?.documents?.find((d) => d.side === match[2]);
    if (!doc) return fail(res, 404, 'NOT_FOUND', 'That contract has no such signed PDF yet');
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${doc.fileName}"` });
    return res.end(PDF);
  }
  if (method === 'GET' && path === '/studio-portal/projects') return send(res, 200, db.projects.map(projectSummary));
  if (method === 'GET' && (match = path.match(/^\/studio-portal\/projects\/([^/]+)\/idea-files\/([^/]+)\/content$/))) {
    const file = db.projects.find((item) => item.id === match[1])?.ideaFiles?.find((item) => item.id === match[2]);
    if (!file) return fail(res, 404, 'NOT_FOUND', 'Idea file not found');
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file.fileName}"` });
    return res.end(PDF);
  }
  if (method === 'GET' && (match = path.match(/^\/studio-portal\/projects\/([^/]+)$/))) {
    const project = db.projects.find((item) => item.id === match[1]);
    return project ? send(res, 200, projectDetail(project)) : fail(res, 404, 'NOT_FOUND', 'Project not found');
  }
  // Like local disk storage: no signed URLs, so Studio Web falls back to the multipart route.
  if (method === 'POST' && /^\/studio-portal\/episodes\/[^/]+\/media\/uploads$/.test(path)) {
    return send(res, 501, { error: { code: 'NOT_IMPLEMENTED', message: 'No direct uploads', details: { reason: 'DIRECT_UPLOAD_UNSUPPORTED' } } });
  }
  if (method === 'POST' && (match = path.match(/^\/studio-portal\/episodes\/([^/]+)\/media(\/upload)?$/))) {
    return deliver(res, match[1], match[2] ? 'UPLOAD' : body.sourceMethod);
  }
  if (method === 'POST' && (match = path.match(/^\/studio-portal\/media-assets\/([^/]+)\/retry$/))) return retry(res, match[1]);
  if (method === 'GET' && path === '/notifications') {
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const page = Number(url.searchParams.get('page') ?? 1);
    const totalItems = db.notifications.length;
    const data = db.notifications.slice((page - 1) * limit, page * limit);
    return send(res, 200, { data, meta: { itemsPerPage: limit, totalItems, currentPage: page, totalPages: Math.max(1, Math.ceil(totalItems / limit)) } });
  }
  if (method === 'GET' && path === '/notifications/unread-count') {
    return send(res, 200, { unread: db.notifications.filter((item) => !item.readAt).length });
  }
  if (method === 'PATCH' && (match = path.match(/^\/notifications\/([^/]+)\/read$/))) {
    const item = db.notifications.find((n) => n.id === match[1]);
    if (!item) return fail(res, 404, 'NOT_FOUND', 'Notification not found');
    item.readAt ??= now();
    return send(res, 204);
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
