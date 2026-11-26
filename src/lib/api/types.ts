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
  user?: AuthUser;
}

export type ContractDocumentSide = 'ADMIN' | 'STUDIO' | 'FINAL';

/** A signed copy of a round rendered by the system (metadata only; downloaded through /api/contracts/...). */
export interface ContractDocument {
  id: string;
  side: ContractDocumentSide;
  fileName: string;
  sizeBytes: number | string;
  checksum: string;
  uploadedAt: string;
}

export interface StudioProfile {
  id: string;
  name: string;
  email: string | null;
  contactName: string | null;
  phone: string | null;
}

/** A field of the studio's legal profile; contactName is kept by the Admin, the others by the studio itself. */
export type LegalProfileField = 'address' | 'taxCode' | 'bankAccount' | 'bankName' | 'representativeTitle' | 'contactName';

/** What the studio fills in on the Hồ sơ pháp lý page: Bên B of every contract it signs. */
export interface LegalProfileInput {
  address: string;
  taxCode: string;
  bankAccount: string;
  bankName: string;
  representativeTitle: string;
}

/** GET /studio-portal/profile: the studio, its legal profile and what still blocks signing. */
export interface StudioLegalProfile extends StudioProfile {
  address: string | null;
  taxCode: string | null;
  bankAccount: string | null;
  bankName: string | null;
  representativeTitle: string | null;
  missing: LegalProfileField[];
  complete: boolean;
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
  /** Budget ceiling of the round while open (its value until a side proposes less), the signed cost once closed. */
  budgetVnd: number;
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
  documents?: ContractDocument[];
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

/** The poster image the studio sent for the movie. */
export interface StudioPoster {
  fileName: string;
  uploadedAt: string;
}

/** An idea or synopsis file the Content Reviewer attached to the project. */
export interface StudioIdeaFile {
  id: string;
  fileName: string;
  purpose: 'IDEA' | 'SYNOPSIS';
  version: number;
  sizeBytes: number;
  createdAt: string;
}

export interface ProjectDetail {
  id: string;
  status: ProjectStatus;
  ideaDescription: string;
  ideaFiles: StudioIdeaFile[];
  handedOffAt: string | null;
  title: string;
  synopsis: string | null;
  ageRating: string | null;
  defaultLanguage: string | null;
  finalScript: { version: number; content: string } | null;
  studioPoster: StudioPoster | null;
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
