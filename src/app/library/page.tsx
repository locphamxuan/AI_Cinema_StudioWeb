import { AccessGate } from '@/components/AccessGate';
import { Guarded, PageTitle } from '@/components/common';
import { FilmLibrary } from '@/components/FilmLibrary';
import { loadCatalog } from '@/lib/demo/catalog';

export const dynamic = 'force-dynamic';

export default function LibraryPage() {
  return (
    <AccessGate>
      <PageTitle
        title="Phim soạn sẵn"
        description="Studio không sản xuất video: các bản giao dưới đây được chuẩn bị trước cho buổi demo (sửa trong demo-data/projects.json)."
      />
      <Guarded load={async () => <FilmLibrary catalog={await loadCatalog()} />} />
    </AccessGate>
  );
}
