'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  ExternalLink,
  PlusCircle,
  Hash,
  CornerDownLeft,
  Sparkles,
  Command as CmdIcon,
} from 'lucide-react';
import { GoLink } from '@stager/database';

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goLinks: GoLink[];
  onSelectLink: (link: GoLink) => void;
  onCreateLinkRequest: (suggestedKeyword?: string) => void;
}

export function CommandBar({
  open,
  onOpenChange,
  goLinks,
  onSelectLink,
  onCreateLinkRequest,
}: CommandBarProps) {
  const [search, setSearch] = useState('');
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const dismiss = () => {
    onOpenChange(false);
  };

  // Keyboard shortcut listener for Cmd+K and Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Capture the previously focused element, move focus into the dialog, and
  // restore it when Escape (or any other dismiss) closes the bar.
  useLayoutEffect(() => {
    if (!open) return;

    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (previous && previous !== inputRef.current) {
      lastActiveRef.current = previous;
    }

    inputRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      setSearch('');
      const restoreTarget = lastActiveRef.current;
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [open, onOpenChange]);

  const filteredLinks = goLinks.filter((link) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      link.keyword.toLowerCase().includes(query) ||
      (link.description && link.description.toLowerCase().includes(query)) ||
      link.target_url.toLowerCase().includes(query)
    );
  });

  const exactMatch = goLinks.some(
    (l) => l.keyword.toLowerCase() === search.toLowerCase().trim()
  );

  const handleSelectLink = (link: GoLink) => {
    dismiss();
    onSelectLink(link);
  };

  const handleCreateNew = (suggestedKey?: string) => {
    dismiss();
    onCreateLinkRequest(suggestedKey);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="bg-surface border border-surface-highlight/70 shadow-2xl rounded-xl overflow-hidden text-slate-100 flex flex-col ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-brand focus-within:border-brand transition-all"
          shouldFilter={false} // We do custom fuzzy/substring filtering
        >
          {/* Input row */}
          <div className="flex items-center px-4 border-b border-surface-elevated">
            <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={(val) => startTransition(() => setSearch(val))}
              placeholder="Search go-links, keywords, or type 'go/<name>'..."
              className="w-full py-4 bg-transparent text-slate-100 placeholder-slate-500 text-base outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs px-2 py-1 text-slate-400 hover:text-slate-200 bg-surface-elevated rounded"
              >
                Clear
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 ml-3 px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-surface-elevated rounded border border-surface-highlight">
              ESC
            </kbd>
          </div>

          {/* List of results */}
          <Command.List className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-surface-highlight">
            {filteredLinks.length === 0 && search.trim() && (
              <div className="py-8 px-6 text-center">
                <p className="text-sm text-slate-400">
                  No matching go-link found for{' '}
                  <span className="text-brand font-mono font-medium">
                    &quot;go/{search.trim()}&quot;
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => handleCreateNew(search.trim())}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-brand hover:opacity-90 text-brand-foreground rounded-lg transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create go/{search.trim()}
                </button>
              </div>
            )}

            {filteredLinks.length > 0 && (
              <Command.Group
                heading={
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2 py-1">
                    <span>GO-LINKS ({filteredLinks.length})</span>
                    <span className="text-[11px] text-slate-500">Press ↵ to open</span>
                  </div>
                }
              >
                {filteredLinks.map((link) => (
                  <Command.Item
                    key={link.id}
                    value={link.keyword}
                    onSelect={() => handleSelectLink(link)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors hover:bg-surface-elevated data-[selected=true]:bg-brand-subtle data-[selected=true]:text-brand text-slate-300 border border-transparent data-[selected=true]:border-brand-muted group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center text-brand group-hover:text-brand shrink-0 border border-surface-highlight">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 group-data-[selected=true]:text-brand font-mono">
                            go/{link.keyword}
                          </span>
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">
                            {link.target_url}
                          </span>
                        </div>
                        {link.description && (
                          <p className="text-xs text-slate-400 truncate">
                            {link.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-[11px] font-mono text-slate-400 bg-surface-elevated px-2 py-0.5 rounded border border-surface-highlight/50">
                        {link.click_count} clicks
                      </span>
                      <CornerDownLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* If search query has no exact match and user typed something, show inline create prompt */}
            {search.trim() && !exactMatch && filteredLinks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-surface-elevated px-2">
                <button
                  type="button"
                  onClick={() => handleCreateNew(search.trim())}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-brand" />
                    <span>
                      Create new go-link:{' '}
                      <span className="font-mono text-brand font-semibold">
                        go/{search.trim()}
                      </span>
                    </span>
                  </div>
                  <kbd className="px-1.5 py-0.5 bg-surface-elevated text-slate-400 rounded text-[10px] border border-surface-highlight">
                    New Link
                  </kbd>
                </button>
              </div>
            )}
          </Command.List>

          {/* Footer bar */}
          <div className="px-4 py-2.5 bg-surface-elevated/60 border-t border-surface-elevated flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Stager Omnibox Engine</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded text-[10px] font-mono border border-surface-highlight">
                  ↑↓
                </kbd>{' '}
                Navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded text-[10px] font-mono border border-surface-highlight">
                  ↵
                </kbd>{' '}
                Open URL
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
