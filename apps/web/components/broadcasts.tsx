'use client';

import React, { useState, useTransition } from 'react';
import {
  Megaphone,
  CheckCircle2,
  Check,
  Clock,
  Pin,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  Vote,
  BarChart2,
} from 'lucide-react';
import { Broadcast } from '@stager/database';

interface BroadcastsProps {
  broadcasts: Broadcast[];
  onAcknowledge: (id: string, pollResponse?: string) => Promise<void>;
  onOpenCreateModal?: () => void;
}

// Markdown parser helper for bold and code tokens
function renderFormattedContent(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-surface-elevated text-brand font-mono text-[11px] border border-surface-highlight"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function formatExpiration(expiresAt?: string | null): string {
  if (!expiresAt) return 'No expiry';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return diffHours > 0 ? `Expires in ${diffHours}h ${mins}m` : `Expires in ${mins}m`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Expires in ${diffDays}d`;
}

export function BroadcastsWidget({
  broadcasts,
  onAcknowledge,
  onOpenCreateModal,
}: BroadcastsProps) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [optimisticAcks, setOptimisticAcks] = useState<
    Record<string, { acknowledged: boolean; user_poll_response?: string | null }>
  >({});
  const [actingId, setActingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleAction = async (id: string, pollResponse?: string) => {
    // Immediate optimistic update
    setActingId(id);
    setOptimisticAcks((prev) => ({
      ...prev,
      [id]: { acknowledged: true, user_poll_response: pollResponse || null },
    }));

    try {
      await onAcknowledge(id, pollResponse);
    } catch (err) {
      console.error('Failed to acknowledge broadcast:', err);
      // Rollback optimistic update on failure
      setOptimisticAcks((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } finally {
      setActingId(null);
    }
  };

  const toggleExpand = (id: string, defaultExpanded: boolean) => {
    startTransition(() => {
      setExpandedMap((prev) => ({
        ...prev,
        [id]: prev[id] !== undefined ? !prev[id] : !defaultExpanded,
      }));
    });
  };

  if (!broadcasts || broadcasts.length === 0) {
    return null;
  }

  const unreadCount = broadcasts.filter((b) => {
    const opt = optimisticAcks[b.id];
    return opt ? !opt.acknowledged : !b.acknowledged;
  }).length;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <Megaphone className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
              Operational Broadcasts
            </h2>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {unreadCount} Action Required
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-subtle text-brand border border-brand-muted">
                All Caught Up
              </span>
            )}
          </div>
        </div>

        {onOpenCreateModal && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-surface border border-surface-highlight hover:border-brand rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-brand" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {/* Broadcasts Stack */}
      <div className="space-y-3">
        {broadcasts.map((broadcast) => {
          const opt = optimisticAcks[broadcast.id];
          const isAcknowledged = opt ? opt.acknowledged : !!broadcast.acknowledged;
          const userPollResponse = opt ? opt.user_poll_response : broadcast.user_poll_response;
          const isPending = actingId === broadcast.id;

          // Default state: unacknowledged cards are expanded; acknowledged cards are collapsed
          const isExpanded =
            expandedMap[broadcast.id] !== undefined
              ? expandedMap[broadcast.id]
              : !isAcknowledged;

          // Compute read metrics
          const baseReadCount = broadcast.read_count ?? 0;
          const currentReadCount =
            isAcknowledged && !broadcast.acknowledged ? baseReadCount + 1 : baseReadCount;
          const totalTargeted = broadcast.total_targeted || 100;
          const readPercentage = Math.min(
            100,
            Math.round((currentReadCount / totalTargeted) * 100)
          );

          // Compute poll tallies
          const hasPoll = Array.isArray(broadcast.poll_options) && broadcast.poll_options.length > 0;
          let pollResults = { ...(broadcast.poll_results || {}) };
          if (hasPoll && isAcknowledged && userPollResponse && !broadcast.acknowledged) {
            pollResults[userPollResponse] = (pollResults[userPollResponse] || 0) + 1;
          }
          const totalVotes = Object.values(pollResults).reduce((sum, v) => sum + v, 0);

          // 1. Collapsed Row View (Collapsed-after-read state)
          if (!isExpanded) {
            return (
              <div
                key={broadcast.id}
                className="flex items-center justify-between p-3 rounded-xl border bg-surface/60 border-surface-highlight hover:border-surface-highlight/80 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-subtle text-brand border border-brand-muted shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Acknowledged
                  </span>
                  <span className="font-medium text-slate-200 truncate">
                    {broadcast.title}
                  </span>
                  <span className="text-[11px] text-slate-500 shrink-0 hidden sm:inline">
                    • {readPercentage}% team read rate
                  </span>
                  {userPollResponse && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-brand shrink-0 hidden md:inline">
                      • Voted: &ldquo;{userPollResponse}&rdquo;
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(broadcast.id, false)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-elevated transition-colors ml-2 shrink-0"
                >
                  <span>Details</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          // 2. Full Interactive Card View (Unread or Expanded Acknowledged)
          return (
            <div
              key={broadcast.id}
              className={`relative flex flex-col p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
                isAcknowledged
                  ? 'bg-surface/75 border-surface-highlight shadow-sm'
                  : 'bg-surface border-brand-muted/40 hover:border-brand-muted/70 shadow-md ring-1 ring-brand-muted/20'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {broadcast.department}
                  </span>

                  <span className="inline-flex items-center text-[11px] text-slate-400 font-medium">
                    {broadcast.author_name || 'Team Lead'}
                    {broadcast.author_role && ` • ${broadcast.author_role}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {broadcast.expires_at && (
                    <span className="text-[10px] flex items-center gap-1 text-amber-400/90 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" />
                      {formatExpiration(broadcast.expires_at)}
                    </span>
                  )}
                  <Pin className="w-3.5 h-3.5 fill-current text-amber-400" />
                  {isAcknowledged && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(broadcast.id, true)}
                      className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-surface-elevated transition-colors"
                      title="Collapse announcement"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-sm sm:text-base font-semibold text-slate-100 mb-2 leading-snug">
                {broadcast.title}
              </h3>

              {/* Markdown Content */}
              <p className="text-xs text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
                {renderFormattedContent(broadcast.content)}
              </p>

              {/* Read-Receipt Progress Bar */}
              <div className="space-y-1.5 pt-3 border-t border-surface-elevated">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-slate-500" />
                    <strong className="font-semibold text-slate-200">
                      {readPercentage}%
                    </strong>{' '}
                    of your targeted team has read this
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {currentReadCount} / {totalTargeted} members
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden border border-surface-highlight/40">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-500"
                    style={{ width: `${readPercentage}%` }}
                  />
                </div>
              </div>

              {/* Micro-Poll Breakdown or Action Footer */}
              {hasPoll ? (
                <div className="mt-4 pt-3 border-t border-surface-elevated">
                  {!isAcknowledged ? (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-2.5">
                        <Vote className="w-3.5 h-3.5 text-brand" />
                        <span>Select an option to acknowledge & record your vote:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {broadcast.poll_options!.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAction(broadcast.id, opt)}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated hover:bg-brand hover:text-brand-foreground text-slate-200 border border-surface-highlight hover:border-brand transition-all disabled:opacity-50"
                          >
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300 flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-brand" />
                          Micro-Poll Results ({totalVotes} votes)
                        </span>
                        {userPollResponse && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-brand-subtle text-brand border border-brand-muted">
                            <Check className="w-3 h-3" />
                            Your choice: {userPollResponse}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {broadcast.poll_options!.map((opt) => {
                          const votes = pollResults[opt] || 0;
                          const pct =
                            totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                          const isUserChoice = userPollResponse === opt;

                          return (
                            <div
                              key={opt}
                              className={`p-2 rounded-lg border text-xs relative overflow-hidden transition-all ${
                                isUserChoice
                                  ? 'bg-brand-subtle/50 border-brand-muted'
                                  : 'bg-surface-elevated/60 border-surface-highlight/60'
                              }`}
                            >
                              <div
                                className="absolute inset-0 bg-brand/10 pointer-events-none transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative flex items-center justify-between z-10">
                                <span
                                  className={`font-medium ${
                                    isUserChoice ? 'text-brand' : 'text-slate-300'
                                  }`}
                                >
                                  {isUserChoice ? `✓ ${opt}` : opt}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {votes} ({pct}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Simple Acknowledgment Action Footer */
                <div className="mt-4 pt-3 border-t border-surface-elevated flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Published {new Date(broadcast.created_at).toLocaleDateString()}
                  </span>

                  {isAcknowledged ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-brand-subtle text-brand border border-brand-muted animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Acknowledged
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(broadcast.id, true)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-surface-elevated transition-colors"
                      >
                        Collapse
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAction(broadcast.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-brand text-brand-foreground hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isPending ? (
                        <span className="animate-pulse">Recording...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          I&apos;ve Read This
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
