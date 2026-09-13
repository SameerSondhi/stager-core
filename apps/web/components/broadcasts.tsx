'use client';

import React, { useState } from 'react';
import {
  Megaphone,
  CheckCircle2,
  Check,
  Clock,
  Pin,
  Sparkles,
} from 'lucide-react';
import { Broadcast } from '@stager/database';

interface BroadcastsProps {
  broadcasts: Broadcast[];
  onAcknowledge: (id: string) => Promise<void>;
}

export function BroadcastsWidget({ broadcasts, onAcknowledge }: BroadcastsProps) {
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [justAcked, setJustAcked] = useState<Record<string, boolean>>({});

  const handleAck = async (id: string) => {
    setAckingId(id);
    try {
      await onAcknowledge(id);
      setJustAcked((prev) => ({ ...prev, [id]: true }));
    } finally {
      setAckingId(null);
    }
  };

  if (!broadcasts || broadcasts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <Megaphone className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Pinned Company Broadcasts
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          {broadcasts.filter((b) => !b.acknowledged && !justAcked[b.id]).length} unacknowledged
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {broadcasts.map((broadcast) => {
          const isAcknowledged = broadcast.acknowledged || justAcked[broadcast.id];
          const isPending = ackingId === broadcast.id;

          return (
            <div
              key={broadcast.id}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
                isAcknowledged
                  ? 'bg-surface/50 border-surface-highlight/40 opacity-75'
                  : 'bg-surface border-surface-highlight hover:border-amber-500/40 shadow-sm'
              }`}
            >
              <div>
                {/* Header row: Dept pill, Role, Pin */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {broadcast.department}
                    </span>
                    {broadcast.author_role && (
                      <span className="inline-flex items-center text-[11px] text-slate-400 font-medium">
                        by {broadcast.author_role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Pin className="w-3.5 h-3.5 fill-current text-amber-400" />
                    {broadcast.expires_at && (
                      <span className="text-[10px] flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-slate-100 mb-1.5 leading-snug">
                  {broadcast.title}
                </h3>

                {/* Content preview */}
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {broadcast.content}
                </p>
              </div>

              {/* Footer action bar */}
              <div className="pt-2 border-t border-surface-elevated flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Published {new Date(broadcast.created_at).toLocaleDateString()}
                </span>

                {isAcknowledged ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-subtle text-brand border border-brand-muted animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Acknowledged
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAck(broadcast.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-surface-elevated hover:bg-brand hover:text-brand-foreground text-slate-300 transition-all border border-surface-highlight disabled:opacity-50"
                  >
                    {isPending ? (
                      <span className="animate-pulse">Saving...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Acknowledge
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
