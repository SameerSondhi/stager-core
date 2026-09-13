'use client';

import React, {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Command } from 'cmdk';
import {
  Search,
  ExternalLink,
  PlusCircle,
  Hash,
  CornerDownLeft,
  Sparkles,
  Megaphone,
} from 'lucide-react';
import { GoLink, interpolateGoLinkUrl, isParameterizedGoLink, parseGoLinkInput, goLinkParamPlaceholder } from '@stager/database';

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goLinks: GoLink[];
  onSelectLink: (link: GoLink, resolvedUrl?: string) => void;
  onCreateLinkRequest: (suggestedKeyword?: string) => void;
  onCreateBroadcastRequest?: () => void;
}

export function CommandBar({
  open,
  onOpenChange,
  goLinks,
  onSelectLink,
  onCreateLinkRequest,
  onCreateBroadcastRequest,
}: CommandBarProps) {

  const [search, setSearch] = useState('');
  const deferredQuery = useDeferredValue(search);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef(search);
  searchRef.current = search;

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

  const handleSelectLink = (link: GoLink, resolvedUrl?: string) => {
    dismiss();
    onSelectLink(link, resolvedUrl);
  };

  const handleCreateNew = (suggestedKey?: string) => {
    dismiss();
    onCreateLinkRequest(suggestedKey);
  };

  const parsed = parseGoLinkInput(deferredQuery);
  const liveParsed = parseGoLinkInput(search);
  const query = (
    liveParsed.parameter ? liveParsed.keyword : parsed.keyword || deferredQuery.toLowerCase().trim()
  ).toLowerCase();

  const parameterizedMatch = useMemo(() => {
    if (!liveParsed.parameter) return null;
    const link = goLinks.find(
      (l) =>
        l.keyword.toLowerCase() === liveParsed.keyword && isParameterizedGoLink(l)
    );
    if (!link) return null;
    return {
      link,
      url: interpolateGoLinkUrl(link, liveParsed.parameter),
      parameter: liveParsed.parameter,
    };
  }, [goLinks, liveParsed.keyword, liveParsed.parameter]);

  const filteredLinks = useMemo(() => {
    if (!query) return goLinks;
    return goLinks.filter(
      (link) =>
        link.keyword.toLowerCase().includes(query) ||
        (link.description && link.description.toLowerCase().includes(query)) ||
        link.target_url.toLowerCase().includes(query)
    );
  }, [goLinks, query]);

  const exactMatch = useMemo(
    () =>
      Boolean(parameterizedMatch) ||
      goLinks.some((l) => l.keyword.toLowerCase() === (parsed.keyword || query)),
    [goLinks, parsed.keyword, query, parameterizedMatch]
  );

  const actionMatches = useMemo(
    () =>
      [
        {
          id: 'post-announcement',
          title: 'Post Team Announcement',
          desc: 'Create a pinned broadcast with read-receipts & micro-poll',
          icon: <Megaphone className="w-4 h-4" />,
          iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          tag: 'Broadcast',
          action: () => {
            dismiss();
            onCreateBroadcastRequest?.();
          },
          keywords: ['post', 'announcement', 'broadcast', 'operational', 'poll', 'news', 'update'],
        },
        {
          id: 'create-link',
          title: 'Create New Go-Link',
          desc: 'Add an internal shortcut to your organization directory',
          icon: <PlusCircle className="w-4 h-4" />,
          iconBg: 'bg-surface-elevated text-brand border-surface-highlight',
          tag: 'Go-Link',
          action: () => handleCreateNew(searchRef.current.trim() || undefined),
          keywords: ['create', 'new', 'go', 'link', 'shortcut', 'url'],
        },
      ].filter((act) => {
        if (!query) return true;
        return (
          act.title.toLowerCase().includes(query) ||
          act.desc.toLowerCase().includes(query) ||
          act.keywords.some((k) => k.includes(query))
        );
      }),
    [query, onCreateBroadcastRequest, onCreateLinkRequest]
  );

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
              onValueChange={setSearch}
              autoFocus
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
            {parameterizedMatch && (
              <Command.Group
                heading={
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2 py-1">
                    <span>PARAMETERIZED GO-LINK</span>
                  </div>
                }
              >
                <Command.Item
                  key={`param-${parameterizedMatch.link.id}`}
                  value={search}
                  onSelect={() =>
                    handleSelectLink(parameterizedMatch.link, parameterizedMatch.url)
                  }
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors hover:bg-surface-elevated data-[selected=true]:bg-brand-subtle data-[selected=true]:text-brand text-slate-300 border border-transparent data-[selected=true]:border-brand-muted group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-brand-subtle flex items-center justify-center text-brand shrink-0 border border-brand-muted">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 group-data-[selected=true]:text-brand">
                        Navigate to:{' '}
                        <span className="font-mono text-brand text-xs sm:text-sm break-all">
                          {parameterizedMatch.url}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        go/{parameterizedMatch.link.keyword}/{parameterizedMatch.parameter}
                      </p>
                    </div>
                  </div>
                  <CornerDownLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0 ml-3" />
                </Command.Item>
              </Command.Group>
            )}
            {filteredLinks.length === 0 &&
              actionMatches.length === 0 &&
              !parameterizedMatch &&
              search.trim() && (
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

            {/* Operational Actions */}
            {actionMatches.length > 0 && (
              <Command.Group
                heading={
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2 py-1">
                    <span>QUICK ACTIONS</span>
                  </div>
                }
              >
                {actionMatches.map((act) => (
                  <Command.Item
                    key={act.id}
                    value={act.title}
                    onSelect={act.action}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors hover:bg-surface-elevated data-[selected=true]:bg-brand-subtle data-[selected=true]:text-brand text-slate-300 border border-transparent data-[selected=true]:border-brand-muted group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${act.iconBg}`}
                      >
                        {act.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 group-data-[selected=true]:text-brand">
                          {act.title}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {act.desc}
                        </p>
                      </div>
                    </div>
                    <kbd className="px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-surface-elevated rounded border border-surface-highlight shrink-0 ml-3">
                      {act.tag}
                    </kbd>
                  </Command.Item>
                ))}
              </Command.Group>
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
                    onSelect={() =>
                      handleSelectLink(
                        link,
                        interpolateGoLinkUrl(link, null)
                      )
                    }
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
                            {isParameterizedGoLink(link)
                              ? `go/${link.keyword} ${goLinkParamPlaceholder(link.keyword)}`
                              : link.target_url}
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
