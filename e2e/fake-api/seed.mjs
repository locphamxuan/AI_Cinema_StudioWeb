// Seed of the fake AI Cinema API: one studio account and the three situations the tests walk through.
export const STUDIO_ACCOUNT = {
  id: '0b6f0c1e-1111-4a6b-9c55-000000000001',
  email: 'studio@aicinema.com',
  password: 'Aicinema@123',
  fullName: 'Lumen Studio',
  role: 'STUDIO',
};

export const IDS = {
  studio: '0b6f0c1e-2222-4a6b-9c55-000000000001',
  negotiating: '0b6f0c1e-3333-4a6b-9c55-000000000001',
  fresh: '0b6f0c1e-3333-4a6b-9c55-000000000002',
  producing: '0b6f0c1e-3333-4a6b-9c55-000000000003',
  awaitingEpisode: '0b6f0c1e-4444-4a6b-9c55-000000000001',
  failedEpisode: '0b6f0c1e-4444-4a6b-9c55-000000000002',
  failedDelivery: '0b6f0c1e-5555-4a6b-9c55-000000000001',
};

const ADMIN = { id: '0b6f0c1e-6666-4a6b-9c55-000000000001', fullName: 'Admin AI Cinema' };
const TERMS = 'Studio sản xuất đúng Kịch bản Final và tiến độ đã thống nhất; Studio không chia sẻ phim cho bên thứ ba.';
const AT = '2026-11-07T03:00:00.000Z';

function contract(id, projectId, round, fields) {
  return {
    id,
    projectId,
    studioId: IDS.studio,
    round,
    previousId: null,
    costVnd: null,
    proposedBy: null,
    status: 'SENT',
    terms: TERMS,
    adminSignedAt: null,
    adminSignedBy: null,
    studioSignedAt: null,
    createdAt: AT,
    updatedAt: AT,
    ...fields,
  };
}

function episode(id, episodeNumber, title, fields = {}) {
  return {
    id,
    episodeNumber,
    title,
    synopsis: null,
    status: 'AWAITING_MEDIA',
    targetDurationSeconds: 600,
    deliveryDeadline: '2099-01-01T00:00:00.000Z',
    dueDate: null,
    latestDelivery: null,
    ...fields,
  };
}

function project(id, title, status, episodes, fields = {}) {
  return {
    id,
    status,
    ideaDescription: `Ý tưởng của ${title}`,
    handedOffAt: null,
    title,
    synopsis: null,
    ageRating: 'T13',
    defaultLanguage: 'vi',
    finalScript: { version: 1, content: `Kịch bản Final của ${title}` },
    episodes,
    ...fields,
  };
}

/** A fresh copy of the data: every test starts from it. */
export function seed() {
  return {
    studio: { id: IDS.studio, name: 'Lumen Studio', email: 'studio@aicinema.com', contactName: 'Chị Lan', phone: '0900000000' },
    projects: [
      project(IDS.negotiating, 'Hành trình ánh sáng', 'ASSIGNED', [episode('0b6f0c1e-4444-4a6b-9c55-000000000003', 1, 'Khởi đầu')]),
      // The studio was just picked for this project, e.g. after the Admin changed the studio: a SENT template waits.
      project(IDS.fresh, 'Mùa hạ cuối', 'ASSIGNED', []),
      project(IDS.producing, 'Phố đêm', 'IN_PRODUCTION', [
        episode(IDS.awaitingEpisode, 1, 'Đèn đường'),
        episode(IDS.failedEpisode, 2, 'Mưa phố', {
          latestDelivery: {
            id: IDS.failedDelivery,
            version: 1,
            ingestStatus: 'FAILED',
            failureReason: 'Không tải được tệp từ đường dẫn',
            createdAt: AT,
            changeRequest: null,
          },
        }),
      ], { handedOffAt: AT }),
    ],
    contracts: [
      contract('0b6f0c1e-7777-4a6b-9c55-000000000001', IDS.negotiating, 1, {
        status: 'SUPERSEDED',
        costVnd: 200_000_000,
        proposedBy: 'STUDIO',
        studioSignedAt: AT,
      }),
      contract('0b6f0c1e-7777-4a6b-9c55-000000000002', IDS.negotiating, 2, {
        previousId: '0b6f0c1e-7777-4a6b-9c55-000000000001',
        status: 'ADMIN_COUNTERED',
        costVnd: 150_000_000,
        proposedBy: 'ADMIN',
        adminSignedAt: AT,
        adminSignedBy: ADMIN,
        updatedAt: '2026-11-08T03:00:00.000Z',
      }),
      contract('0b6f0c1e-7777-4a6b-9c55-000000000003', IDS.fresh, 1, { updatedAt: '2026-11-09T03:00:00.000Z' }),
      contract('0b6f0c1e-7777-4a6b-9c55-000000000004', IDS.producing, 1, {
        status: 'SIGNED',
        costVnd: 170_000_000,
        proposedBy: 'STUDIO',
        studioSignedAt: AT,
        adminSignedAt: AT,
        adminSignedBy: ADMIN,
      }),
    ],
    notifications: [
      { id: '0b6f0c1e-8888-4a6b-9c55-000000000001', type: 'CONTRACT_COUNTERED', title: 'Admin đề xuất giá mới', body: null, link: '/contracts', readAt: null, createdAt: AT },
    ],
  };
}
