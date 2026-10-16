'use client';

import { useState, type ReactNode } from 'react';
import { Film, Upload } from 'lucide-react';

const TABS = [
  { key: 'upload', label: 'Tải video từ máy', icon: Upload },
  { key: 'prepared', label: 'Phim soạn sẵn', icon: Film },
] as const;

/** The two ways to hand a film back: videos from the studio's machine, or a film prepared for the demo. */
export function ReplyTabs({ upload, prepared }: { upload: ReactNode; prepared: ReactNode }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('upload');
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Cách gửi lại phim" className="flex gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
              tab === key ? 'border-accent bg-accent text-white' : 'border-border text-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === 'upload' ? upload : prepared}</div>
    </div>
  );
}
