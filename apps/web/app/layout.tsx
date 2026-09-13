import type { Metadata } from 'next';
import './globals.css';
import { stagerDb } from '@stager/database';

export const metadata: Metadata = {
  title: 'Stager | Enterprise Launchpad & Command Center',
  description: 'Enterprise internal launchpad, contextual command center, and omnibox go-links resolver.',
};

function hexToRgba(hex: string, alpha: number): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return `rgba(16, 185, 129, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const org = await stagerDb.getOrganization();
  const brandPrimary = org?.brand_color || '#10b981';
  const brandMuted = hexToRgba(brandPrimary, 0.2);
  const brandSubtle = hexToRgba(brandPrimary, 0.08);

  const displayName = org?.display_name || org?.name || 'Acme Corp';
  const initial = displayName.charAt(0).toUpperCase();

  const brandVars = {
    '--brand-primary': brandPrimary,
    '--brand-muted': brandMuted,
    '--brand-subtle': brandSubtle,
    '--brand-foreground': '#ffffff',
  } as React.CSSProperties;

  return (
    <html lang="en" className="dark" style={brandVars}>
      <body
        className="min-h-screen bg-background text-slate-100 antialiased selection:bg-brand-subtle selection:text-brand"
        style={brandVars}
      >
        {/* Enterprise Top Header Strip */}
        <div className="w-full bg-surface-elevated/40 border-b border-surface-highlight/50 px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt={displayName}
                className="w-4 h-4 rounded object-contain"
              />
            ) : (
              <span className="w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] bg-brand-subtle text-brand border border-brand-muted">
                {initial}
              </span>
            )}
            <span className="font-mono text-[11px] tracking-wider text-slate-400 font-medium uppercase">
              {displayName}{' '}
              <span className="text-slate-600 font-normal">//</span>{' '}
              <span className="text-slate-300">Mission Control</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="text-[11px] text-slate-400 font-medium">
              All systems operational
            </span>
          </div>
        </div>

        {children}
      </body>
    </html>
  );
}
