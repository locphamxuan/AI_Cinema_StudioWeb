/** Shapes of the AI Cinema API as the Studio Portal returns them (BE `src/modules/production/studio-portal`). */

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions?: string[];
}

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  user: AuthUser;
}

export interface StudioProfile {
  id: string;
  name: string;
  email: string | null;
  contactName: string | null;
  phone: string | null;
}

export type ContractStatus = 'SENT' | 'STUDIO_SIGNED' | 'ADMIN_COUNTERED' | 'SIGNED' | 'SUPERSEDED';

export interface Person {
  id: string;
  fullName: string;
}

export interface Contract {
  id: string;
  projectId: string;
  studioId: string;
  round: number;
  previousId: string | null;
  costVnd: number | null;
  proposedBy: 'ADMIN' | 'STUDIO' | null;
  status: ContractStatus;
  terms: string;
  adminSignedAt: string | null;
  adminSignedBy: Person | null;
  studioSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studio?: { id: string; name: string };
  project?: { id: string; movie?: { title: string } | null } | null;
}

export type ProjectStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PRODUCTION' | 'COMPLETED' | 'UNDER_REVISION' | 'CANCELLED';

export interface ProjectSummary {
  id: string;
  status: ProjectStatus;
  handedOffAt: string | null;
  title: string;
  episodeCount: number;
  contract: { id: string; status: ContractStatus; costVnd: number | null } | null;
}

export type EpisodeStatus =
  | 'DRAFT'
  | 'AWAITING_MEDIA'
  | 'PROCESSING'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'LABELED'
  | 'COMPLIANCE_PASSED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'UNPUBLISHED';

export type IngestStatus = 'PENDING' | 'DOWNLOADING' | 'TRANSCODING' | 'VALIDATING' | 'READY' | 'FAILED' | 'SUPERSEDED';

export interface Delivery {
  id: string;
  version: number;
  ingestStatus: IngestStatus;
  failureReason: string | null;
  createdAt: string;
  changeRequest: { comments: string | null; createdAt: string } | null;
}

export interface PortalEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  synopsis: string | null;
  status: EpisodeStatus;
  targetDurationSeconds: number;
  deliveryDeadline: string | null;
  dueDate: string | null;
  latestDelivery: Delivery | null;
}

export interface ProjectDetail {
  id: string;
  status: ProjectStatus;
  ideaDescription: string;
  handedOffAt: string | null;
  title: string;
  synopsis: string | null;
  ageRating: string | null;
  defaultLanguage: string | null;
  finalScript: { version: number; content: string } | null;
  contracts: Contract[];
  episodes: PortalEpisode[];
}

export interface PortalNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { itemsPerPage: number; totalItems?: number; currentPage: number; totalPages?: number };
}

export type AiGeneratedPart = 'image' | 'video' | 'voice' | 'music' | 'script' | 'subtitle';
export type LabelType = 'AI_GENERATED' | 'AI_EDITED' | 'AI_ASSISTED';

export interface AiDisclosure {
  aiGeneratedParts: AiGeneratedPart[];
  noRealPersonLikeness: boolean;
  noCopyrightedMaterial: boolean;
}

export interface MediaLinkSubmission {
  sourceMethod: 'HLS_URL' | 'REMOTE_FILE';
  sourceUrl: string;
  aiDisclosure: AiDisclosure;
  proposedLabelType: LabelType;
  submissionNote?: string;
}
