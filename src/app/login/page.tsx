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
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.1fr_1fr]">
      <section
        aria-label="Studio Web"
        className="relative hidden overflow-hidden bg-[#07080c] px-12 py-14 text-slate-100 lg:flex lg:flex-col lg:justify-between"
      >
        {/* Projector light over a film-strip edge: the brand mood, drawn with gradients only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(250,204,21,0.22),transparent_55%),radial-gradient(ellipse_at_90%_100%,rgba(244,63,94,0.18),transparent_50%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-[repeating-linear-gradient(180deg,transparent_0_14px,rgba(255,255,255,0.08)_14px_26px)]"
        />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-marquee text-slate-950">
            <Clapperboard className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-[0.2em]">AI CINEMA</p>
            <p className="text-xs text-slate-400">Cổng đối tác sản xuất</p>
          </div>
        </div>
        <div className="relative max-w-md space-y-8">
          <h2 className="text-4xl font-black leading-tight tracking-tight">
            Từ hợp đồng <span className="text-marquee">đến từng thước phim</span>, trên một cổng duy nhất.
          </h2>
          <ol className="space-y-5">
            {JOURNEY.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-50/15 bg-slate-50/5">
                  <Icon className="h-4 w-4 text-marquee" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{`${index + 1}. ${title}`}</p>
                  <p className="text-sm leading-relaxed text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="relative text-xs text-slate-500">Chỉ dành cho Studio đối tác có tài khoản do AI Cinema cấp.</p>
      </section>

      <section className="relative flex flex-col items-center justify-center px-4 py-12 sm:px-10">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted lg:hidden">
              <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" /> AI Cinema · Studio Partner
            </span>
            <h1 className="text-3xl font-black tracking-tight">Studio Web</h1>
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
