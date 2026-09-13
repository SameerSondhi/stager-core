'use client';

import React, { useState } from 'react';
import { X, Settings, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { OAuthConnections } from '@stager/database';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: OAuthConnections;
  onToggle: (
    provider: 'jira' | 'google_calendar',
    action: 'connect' | 'disconnect'
  ) => Promise<void>;
}

export function SettingsModal({
  open,
  onOpenChange,
  connections,
  onToggle,
}: SettingsModalProps) {
  const [pending, setPending] = useState<'jira' | 'google_calendar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleToggle = async (provider: 'jira' | 'google_calendar') => {
    const connected =
      provider === 'jira' ? connections.jira.connected : connections.googleCalendar.connected;
    setError(null);
    setPending(provider);
    try {
      await onToggle(provider, connected ? 'disconnect' : 'connect');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update connection');
    } finally {
      setPending(null);
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
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Settings</h3>
              <p className="text-[11px] text-slate-500">
                Connect live queue sources (OAuth stubs)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close settings"
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

        <div className="mt-4 space-y-3">
          <ConnectionRow
            title="Jira Cloud"
            description="Swap mock tickets for assigned Jira issues"
            connected={connections.jira.connected}
            account={connections.jira.account}
            pending={pending === 'jira'}
            onClick={() => handleToggle('jira')}
          />
          <ConnectionRow
            title="Google Calendar"
            description="Swap mock events for your live calendar"
            connected={connections.googleCalendar.connected}
            account={connections.googleCalendar.account}
            pending={pending === 'google_calendar'}
            onClick={() => handleToggle('google_calendar')}
          />
        </div>

        <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
          These toggles run a local OAuth stub. Connecting a provider replaces the
          corresponding My Queue tab with a live-shaped feed; disconnecting restores mock data.
        </p>
      </div>
    </div>
  );
}

function ConnectionRow({
  title,
  description,
  connected,
  account,
  pending,
  onClick,
}: {
  title: string;
  description: string;
  connected: boolean;
  account?: string | null;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-elevated/50 border border-surface-highlight">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {connected ? (
            <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
          ) : (
            <CircleDashed className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <h4 className="text-sm font-medium text-slate-100">{title}</h4>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
              connected
                ? 'bg-brand-subtle text-brand border-brand-muted'
                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            }`}
          >
            {connected ? 'Live' : 'Mock'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {connected && account ? `Connected as ${account}` : description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
          connected
            ? 'bg-surface hover:bg-surface-highlight text-slate-300 border border-surface-highlight'
            : 'bg-brand hover:opacity-90 text-brand-foreground'
        }`}
      >
        {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {pending ? 'Working…' : connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
