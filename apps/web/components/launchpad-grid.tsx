'use client';

import React, { useState } from 'react';
import {
  Link2,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Plus,
  Compass,
} from 'lucide-react';
import { GoLink } from '@stager/database';

interface LaunchpadGridProps {
  goLinks: GoLink[];
  onOpenLink: (link: GoLink) => void;
  onRequestCreate: () => void;
}

export function LaunchpadGrid({
  goLinks,
  onOpenLink,
  onRequestCreate,
}: LaunchpadGridProps) {
  const [filter, setFilter] = useState<'popular' | 'recent' | 'all'>('popular');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, link: GoLink) => {
    e.stopPropagation();
    const textToCopy = `go/${link.keyword}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(link.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const sortedLinks = [...goLinks].sort((a, b) => {
    if (filter === 'popular') return b.click_count - a.click_count;
    if (filter === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.keyword.localeCompare(b.keyword);
  });

  return (
    <div className="space-y-3">
      {/* Header and Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-subtle flex items-center justify-center text-brand border border-brand-muted">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Go-Links Launchpad
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-slate-400 border border-surface-highlight font-mono">
            {goLinks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="inline-flex p-0.5 rounded-lg bg-surface border border-surface-highlight text-xs">
            <button
              type="button"
              onClick={() => setFilter('popular')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                filter === 'popular'
                  ? 'bg-brand-subtle text-brand border border-brand-muted font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Most Used
            </button>
            <button
              type="button"
              onClick={() => setFilter('recent')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                filter === 'recent'
                  ? 'bg-brand-subtle text-brand border border-brand-muted font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Clock className="w-3 h-3" />
              Recent
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-brand-subtle text-brand border border-brand-muted font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              All
            </button>
          </div>

          <button
            type="button"
            onClick={onRequestCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand hover:opacity-90 text-brand-foreground transition-all shadow-sm shadow-brand/10"
          >
            <Plus className="w-3.5 h-3.5" />
            New Link
          </button>
        </div>
      </div>

      {/* Grid of Go-Link Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedLinks.map((link) => {
          const isCopied = copiedId === link.id;

          return (
            <div
              key={link.id}
              onClick={() => onOpenLink(link)}
              className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-surface border border-surface-highlight hover:border-brand-muted hover:shadow-lg hover:shadow-brand/5 transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-sm text-brand group-hover:opacity-90">
                      go/{link.keyword}
                    </span>
                  </div>

                  <span className="shrink-0 text-[11px] font-mono text-slate-400 bg-surface-elevated px-2 py-0.5 rounded border border-surface-highlight/60">
                    {link.click_count} clicks
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 min-h-[32px] mb-2">
                  {link.description || 'Quick shortcut destination'}
                </p>
              </div>

              <div className="pt-2 border-t border-surface-elevated flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                  {link.target_url.replace(/^https?:\/\//, '')}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Copy go-link"
                    onClick={(e) => handleCopy(e, link)}
                    className={`p-1.5 rounded-md text-xs transition-colors ${
                      isCopied
                        ? 'bg-brand-subtle text-brand'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
                    }`}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    title="Open destination"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLink(link);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-elevated transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
