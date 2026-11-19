import { Clapperboard, FileSignature, Film, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata = { title: 'Đăng nhập - Studio Web' };

/** What a partner studio does here, in the order MF-1 runs it. */
const JOURNEY = [
  { icon: FileSignature, title: 'Nhận và ký hợp đồng', text: 'Hợp đồng có sẵn tên phim, tập, hạn giao và ngân sách.' },
  { icon: Film, title: 'Giao từng tập phim', text: 'Tải tệp MP4 / MOV hoặc dán đường dẫn HLS cho Reviewer duyệt.' },
  { icon: ShieldCheck, title: 'Theo dõi duyệt nội dung', text: 'Xem kết quả duyệt, gắn nhãn AI và yêu cầu chỉnh sửa.' },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  const notice = expired ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : undefined;
  return (
    <main className="grid min-h-dvh bg-background p-2 text-foreground lg:grid-cols-2">
      {/* The brand panel of the template's two-column login, on the right from lg up. */}
      <section
        aria-label="Studio Web"
        className="relative order-2 hidden overflow-hidden rounded-3xl bg-primary px-10 py-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,currentColor_0_14px,transparent_14px_28px)] opacity-[0.06]"
        />
        <div className="relative space-y-3">
          <Clapperboard className="size-10" aria-hidden="true" />
          <p className="text-sm font-semibold tracking-[0.2em] uppercase opacity-80">AI Cinema · Studio đối tác</p>
          <h2 className="max-w-md text-3xl leading-tight font-semibold">Từ hợp đồng đến từng thước phim, trên một cổng duy nhất.</h2>
        </div>
        <ol className="relative grid grid-cols-3 gap-6">
          {JOURNEY.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="space-y-1 border-l border-primary-foreground/30 pl-3 text-sm">
              <Icon className="mb-2 size-4" aria-hidden="true" />
              <p className="font-semibold">{`${index + 1}. ${title}`}</p>
              <p className="opacity-80">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative order-1 flex min-h-[calc(100dvh-1rem)] flex-col items-center justify-center px-4 py-12 sm:px-10">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted lg:hidden">
              <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" /> AI Cinema · Studio Partner
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">Studio Web</h1>
            <p className="text-sm leading-relaxed text-muted">
              Đăng nhập bằng email và mật khẩu tài khoản Studio để vào trang làm việc của bạn.
            </p>
          </div>
          <LoginForm notice={notice} />
          <p className="text-xs leading-relaxed text-muted">
            Chưa có tài khoản hoặc quên mật khẩu? Liên hệ Admin AI Cinema để được cấp lại.
          </p>
        </div>
      </section>
    </main>
  );
}
