import { type NextRequest } from 'next/server';
import { fail, proxyDownload, UUID } from '@/lib/api/download';

/** The signed PDFs by side, and TEMPLATE: the unsigned contract the system generates with the budget ceiling. */
const SIDES = new Set(['ADMIN', 'STUDIO', 'FINAL', 'TEMPLATE']);
const upstreamPath = (contractId: string, side: string) =>
  side === 'TEMPLATE'
    ? `/studio-portal/contracts/${contractId}/template`
    : `/studio-portal/contracts/${contractId}/documents/${side}/content`;

/** Downloads a contract PDF of the studio: the unsigned contract, Admin-signed, studio-signed or the FINAL copy. */
export async function GET(request: NextRequest, context: { params: Promise<{ contractId: string; side: string }> }) {
  const { contractId, side } = await context.params;
  if (!UUID.test(contractId) || !SIDES.has(side)) return fail(400, 'Đường dẫn tài liệu không hợp lệ.');
  return proxyDownload(request, upstreamPath(contractId, side), {
    missing: 'Hợp đồng chưa có bản PDF này.',
    fallbackType: 'application/pdf',
  });
}
