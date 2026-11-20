import Image from 'next/image';

const R2 = 'https://pub-a25bed12bf0f4514910fbf5cba32666f.r2.dev/ai-film/posters';

/** Posters of AI films released on the platform (AI_Film catalogue on R2). */
const POSTERS = [
  'nexus', 'quy-chua-thuc-tinh', 'jackpot', 'mac-ngon-tam-dong', 'nha-tu-tu-than', 'hitoner',
  'the-fallen', 'void-core', 'vung-dich-704', 'tro-choi-ma-soi', 'the-silent-giant', 'thai-tu-trong-sinh',
  'im-lang-that-hua', 'doi-tap-tin-so-0', 'twenty-two-minutes', 'vuong-phi-bat-dac-di', 'the-chronicles-of-bone', 'tay-dam-cu-khoi',
];

/**
 * The background of the sign-in page: a slanted wall of the posters of the AI films on the platform, under a dark
 * veil so the form above it stays readable. Decorative only, hidden from screen readers.
 */
export function PosterWall() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0B0B0F]">
      <div className="absolute -inset-[15%] grid -rotate-[8deg] grid-cols-5 gap-3 md:grid-cols-8 xl:grid-cols-10">
        {[...POSTERS, ...POSTERS, ...POSTERS, ...POSTERS].map((slug, i) => (
          <div key={`${slug}-${i}`} className="relative aspect-[2/3] overflow-hidden rounded-xl">
            <Image src={`${R2}/${slug}.jpg`} alt="" fill sizes="12vw" className="object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(11_11_15/0.55),rgb(11_11_15/0.92)_70%)]" />
    </div>
  );
}
