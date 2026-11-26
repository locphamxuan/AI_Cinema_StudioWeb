import { type NextRequest } from 'next/server';
import { fail, proxyDownload, UUID } from '@/lib/api/download';

/** Downloads an idea or synopsis file the Content Reviewer attached to a project of this studio. */
export async function GET(request: NextRequest, context: { params: Promise<{ projectId: string; fileId: string }> }) {
  const { projectId, fileId } = await context.params;
  if (!UUID.test(projectId) || !UUID.test(fileId)) return fail(400, 'Đường dẫn tài liệu không hợp lệ.');
  return proxyDownload(request, `/studio-portal/projects/${projectId}/idea-files/${fileId}/content`, {
    missing: 'Tài liệu này không còn trong dự án.',
    fallbackType: 'application/octet-stream',
  });
}
