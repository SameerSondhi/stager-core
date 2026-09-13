'use client';

import React, { useState, useEffect } from 'react';
import { X, Link2, PlusCircle, Check } from 'lucide-react';

interface CreateLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKeyword?: string;
  onCreated: (newLink: {
    keyword: string;
    target_url: string;
    description?: string;
    default_url?: string | null;
    defaultUrl?: string | null;
  }) => Promise<void>;

}

export function CreateLinkModal({
  open,
  onOpenChange,
  initialKeyword = '',
  onCreated,
}: CreateLinkModalProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [targetUrl, setTargetUrl] = useState('');
  const [defaultUrl, setDefaultUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasParameterPlaceholder = targetUrl.includes('{}');

  useEffect(() => {
    if (initialKeyword) {
      setKeyword(initialKeyword.replace(/^go\//, ''));
    }
  }, [initialKeyword]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanKey = keyword.trim().toLowerCase().replace(/^go\//, '').replace(/^\//, '');
    if (!cleanKey) {
      setError('Keyword cannot be empty');
      return;
    }

    let url = targetUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      new URL(url.replace(/\{\}/g, 'placeholder'));
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    let fallback: string | null = null;
    if (hasParameterPlaceholder && defaultUrl.trim()) {
      fallback = defaultUrl.trim();
      if (!/^https?:\/\//i.test(fallback)) {
        fallback = `https://${fallback}`;
      }
      try {
        new URL(fallback);
      } catch {
        setError('Please enter a valid fallback URL');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onCreated({
        keyword: cleanKey,
        target_url: url,
        description: description.trim() || undefined,
        default_url: fallback,
        defaultUrl: fallback,
      });
      setKeyword('');
      setTargetUrl('');
      setDefaultUrl('');
      setDescription('');
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md bg-surface border border-surface-highlight rounded-xl shadow-2xl p-5 text-slate-100 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-elevated">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-brand-subtle flex items-center justify-center text-brand border border-brand-muted">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              Create New Go-Link
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Short Keyword
            </label>
            <div className="flex items-center rounded-lg bg-surface-elevated border border-surface-highlight overflow-hidden focus-within:border-brand transition-colors">
              <span className="px-3 text-xs font-mono text-slate-400 bg-surface border-r border-surface-highlight select-none py-2.5">
                go/
              </span>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="wiki, roadmap, demo"
                required
                className="w-full px-3 py-2 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Accessible via browser omnibox: <code className="text-slate-400">go &lt;keyword&gt;</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Destination URL
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://acme.atlassian.net/browse/{}"
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-surface-highlight text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Tip: Add <code className="text-brand font-mono">{'{}'}</code> anywhere in the URL
              to accept arguments (e.g., <code className="text-slate-400 font-mono">go/jira ENG-123</code>).
            </p>
          </div>

          {hasParameterPlaceholder && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fallback URL (When no argument is given)
              </label>
              <input
                type="text"
                value={defaultUrl}
                onChange={(e) => setDefaultUrl(e.target.value)}
                placeholder="https://jira.corp.internal"
                autoFocus={false}
                className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-surface-highlight text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used when someone visits{' '}
                <code className="font-mono text-slate-400">go/{keyword.trim() || 'keyword'}</code>{' '}
                with no argument.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Engineering knowledge base and team playbooks"
              className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-surface-highlight text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-elevated">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-brand hover:opacity-90 text-brand-foreground transition-all disabled:opacity-50 shadow-sm shadow-brand/10"
            >
              {submitting ? 'Creating...' : 'Create Go-Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
