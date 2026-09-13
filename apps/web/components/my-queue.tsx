'use client';

import React, { useState } from 'react';
import {
  Inbox,
  GitPullRequest,
  CheckSquare,
  Calendar,
  ExternalLink,
  Clock,
  AlertCircle,
  Video,
  Settings,
} from 'lucide-react';
import { PersonalQueue } from '@stager/database';

interface MyQueueProps {
  queue: PersonalQueue;
  onOpenSettings?: () => void;
}

export function MyQueueWidget({ queue, onOpenSettings }: MyQueueProps) {
  const [activeTab, setActiveTab] = useState<'jira' | 'prs' | 'calendar'>('jira');

  const sourceBadge = (source: 'mock' | 'live') => (
    <span
      className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-semibold ${
        source === 'live'
          ? 'bg-brand-subtle text-brand border-brand-muted'
          : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
      }`}
    >
      {source}
    </span>
  );

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'P1':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'P2':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'Under Review':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'To Do':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="rounded-xl bg-surface border border-surface-highlight overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Inbox className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
              My Queue
            </h2>
            <p className="text-[11px] text-slate-500">
              Personal triage items across Jira, GitHub & Google Calendar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Queue source settings"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-elevated border border-transparent hover:border-surface-highlight transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

        {/* Tab triggers */}
        <div className="inline-flex p-0.5 rounded-lg bg-surface-elevated border border-surface-highlight text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('jira')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'jira'
                ? 'border border-brand text-brand bg-brand-subtle font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Jira ({queue.jiraIssues.length})
            {sourceBadge(queue.sources?.jira ?? 'mock')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prs')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'prs'
                ? 'border border-brand text-brand bg-brand-subtle font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            PRs ({queue.pullRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'calendar'
                ? 'border border-brand text-brand bg-brand-subtle font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendar ({queue.calendarEvents.length})
            {sourceBadge(queue.sources?.calendar ?? 'mock')}
          </button>
        </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-3">
        {/* JIRA TAB */}
        {activeTab === 'jira' && (
          <div className="space-y-2">
            {queue.jiraIssues.length === 0 && (
              <EmptyTab
                icon={<AlertCircle className="w-4 h-4" />}
                message="No Jira issues. Connect Jira in Settings to load a live feed."
              />
            )}
            {queue.jiraIssues.map((issue) => (
              <a
                key={issue.id}
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated/40 hover:bg-surface-elevated border border-surface-highlight/50 hover:border-surface-highlight transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono ${priorityColor(
                      issue.priority
                    )}`}
                  >
                    {issue.priority}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-300 group-hover:text-brand">
                        {issue.key}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full border ${statusColor(
                          issue.status
                        )}`}
                      >
                        {issue.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-lg mt-0.5">
                      {issue.summary}
                    </p>
                  </div>
                </div>

                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0 ml-2" />
              </a>
            ))}
          </div>
        )}

        {/* PRs TAB */}
        {activeTab === 'prs' && (
          <div className="space-y-2">
            {queue.pullRequests.length === 0 && (
              <EmptyTab
                icon={<GitPullRequest className="w-4 h-4" />}
                message="No pull requests in your queue."
              />
            )}
            {queue.pullRequests.map((pr) => (
              <a
                key={pr.id}
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated/40 hover:bg-surface-elevated border border-surface-highlight/50 hover:border-surface-highlight transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center text-brand shrink-0 border border-surface-highlight">
                    <GitPullRequest className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-brand">
                        {pr.repo}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        by @{pr.author}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate font-medium mt-0.5">
                      {pr.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pr.openSince}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                </div>
              </a>
            ))}
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="space-y-2">
            {queue.calendarEvents.length === 0 && (
              <EmptyTab
                icon={<Calendar className="w-4 h-4" />}
                message="No upcoming events. Connect Google Calendar in Settings to load a live feed."
              />
            )}
            {queue.calendarEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated/40 border border-surface-highlight/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center text-blue-400 shrink-0 border border-surface-highlight">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">
                      {evt.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-blue-400 font-medium">
                        {evt.startTime}
                      </span>
                      <span>•</span>
                      <span className="text-amber-400">{evt.timeLabel}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={evt.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-brand hover:opacity-90 text-brand-foreground transition-all shrink-0 shadow-sm shadow-brand/10"
                >
                  <Video className="w-3.5 h-3.5" />
                  Join
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyTab({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-6 text-xs text-slate-500 justify-center">
      {icon}
      <span>{message}</span>
    </div>
  );
}
