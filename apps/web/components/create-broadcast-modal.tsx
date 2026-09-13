'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Megaphone, Plus, Trash2, Clock, Users, Check } from 'lucide-react';
import { CreateBroadcastInput } from '@stager/database';

interface CreateBroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (input: CreateBroadcastInput) => Promise<void>;
}

const DEPARTMENTS = [
  'All',
  'Engineering',
  'Product',
  'Design',
  'Operations',
  'Security & SRE',
  'Sales',
  'Marketing',
];

const EXPIRATION_OPTIONS = [
  { label: '24 Hours', hours: 24 },
  { label: '3 Days', hours: 72 },
  { label: '7 Days', hours: 168 },
  { label: '30 Days', hours: 720 },
];

export function CreateBroadcastModal({
  open,
  onOpenChange,
  onCreated,
}: CreateBroadcastModalProps) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('All');
  const [authorName, setAuthorName] = useState('Alex Chen');
  const [authorRole, setAuthorRole] = useState('Lead Engineer');
  const [expiresInHours, setExpiresInHours] = useState(168); // 7 days default
  const [hasPoll, setHasPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes / In Favor', 'No / Opposed']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const contentRef = useRef('');

  if (!open) return null;

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Announcement title is required.');
      return;
    }

    if (!contentRef.current.trim()) {
      setError('Announcement content is required.');
      return;
    }

    let cleanedPollOptions: string[] | null = null;
    if (hasPoll) {
      cleanedPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (cleanedPollOptions.length < 2) {
        setError('A micro-poll requires at least 2 non-empty options.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onCreated({
        title: title.trim(),
        content: contentRef.current.trim(),
        department,
        author_name: authorName.trim() || 'Alex Chen',
        author_role: authorRole.trim() || 'Lead Engineer',
        poll_options: cleanedPollOptions,
        expires_in_hours: expiresInHours,
      });

      // Reset form
      setTitle('');
      contentRef.current = '';
      setEditorKey((k) => k + 1);
      setDepartment('All');
      setHasPoll(false);
      setPollOptions(['Yes / In Favor', 'No / Opposed']);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl bg-surface border border-surface-highlight rounded-xl shadow-2xl p-6 text-slate-100 ring-1 ring-white/10 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-elevated">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Post Team Announcement
              </h3>
              <p className="text-[11px] text-slate-400">
                Create a pinned broadcast with read-receipts and optional micro-poll
              </p>
            </div>
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
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Title <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Cloud Infrastructure Maintenance Window"
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-surface-highlight rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Department & Expiration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Target Audience
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-elevated border border-surface-highlight rounded-lg text-slate-200 focus:outline-none focus:border-brand"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === 'All' ? 'Company-Wide (All)' : dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Expiration Window
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-surface-elevated border border-surface-highlight rounded-lg text-slate-200 focus:outline-none focus:border-brand"
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option key={opt.hours} value={opt.hours}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Author Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Author Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Alex Chen"
                className="w-full px-3 py-1.5 text-xs bg-surface-elevated border border-surface-highlight rounded-lg text-slate-200 focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Author Role
              </label>
              <input
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="Lead Engineer"
                className="w-full px-3 py-1.5 text-xs bg-surface-elevated border border-surface-highlight rounded-lg text-slate-200 focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Content (Markdown) — local editor so keystrokes do not re-render the modal */}
          <BroadcastBodyEditor key={editorKey} contentRef={contentRef} />

          {/* Micro-Poll Section */}
          <div className="pt-2 border-t border-surface-elevated">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPoll}
                  onChange={(e) => setHasPoll(e.target.checked)}
                  className="rounded border-surface-highlight bg-surface-elevated text-brand focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-200">
                  Attach Interactive Micro-Poll
                </span>
              </label>
              {hasPoll && pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-[11px] text-brand hover:text-brand-foreground font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Option
                </button>
              )}
            </div>

            {hasPoll && (
              <div className="mt-3 space-y-2 pl-6">
                <p className="text-[11px] text-slate-400 mb-2">
                  Add 2 to 4 choices. Team members will vote and acknowledge simultaneously with one click.
                </p>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 w-4 text-center">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      placeholder={`Choice ${idx + 1}`}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-surface-elevated border border-surface-highlight rounded-md text-slate-100 focus:outline-none focus:border-brand"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove choice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-elevated">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-elevated rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-brand text-brand-foreground hover:opacity-90 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span>Posting...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Post Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toPreviewHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">$1</code>')
    .replace(/\n/g, '<br/>');
}

function BroadcastBodyEditor({
  contentRef,
}: {
  contentRef: React.MutableRefObject<string>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewSource, setPreviewSource] = useState('');

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onInput = () => {
      contentRef.current = el.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setPreviewSource(el.value), 150);
    };

    el.addEventListener('input', onInput);
    return () => {
      el.removeEventListener('input', onInput);
      if (timer) clearTimeout(timer);
    };
  }, [contentRef]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="broadcast-content" className="block text-xs font-medium text-slate-300">
          Announcement Content <span className="text-brand">*</span>
        </label>
        <span className="text-[10px] text-slate-500 font-mono">
          Supports markdown **bold**, `code`
        </span>
      </div>
      <textarea
        id="broadcast-content"
        ref={textareaRef}
        required
        rows={3}
        defaultValue=""
        name="content"
        placeholder="Describe the operational change, release date, action items, or critical alert..."
        className="w-full px-3 py-2 text-xs bg-surface-elevated border border-surface-highlight rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand transition-colors leading-relaxed resize-none"
      />
      {previewSource.trim() ? (
        <div className="mt-2 rounded-lg border border-surface-highlight/70 bg-surface-elevated/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Preview</p>
          <div
            className="text-xs text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: toPreviewHtml(previewSource) }}
          />
        </div>
      ) : null}
    </div>
  );
}
