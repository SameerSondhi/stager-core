'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Command,
  Sparkles,
  Zap,
  Globe,
  Plus,
  ShieldCheck,
  RefreshCw,
  Settings,
} from 'lucide-react';
import {
  GoLink,
  Broadcast,
  PersonalQueue,
  MOCK_PROFILE,
  OAuthConnections,
  Organization,
  CreateBroadcastInput,
  interpolateGoLinkUrl,
} from '@stager/database';
import { CommandBar } from '../components/command-bar';
import { BroadcastsWidget } from '../components/broadcasts';
import { LaunchpadGrid } from '../components/launchpad-grid';
import { MyQueueWidget } from '../components/my-queue';
import { CreateLinkModal } from '../components/create-link-modal';
import { CreateBroadcastModal } from '../components/create-broadcast-modal';
import { SettingsModal } from '../components/settings-modal';

export default function DashboardPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [goLinks, setGoLinks] = useState<GoLink[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [queue, setQueue] = useState<PersonalQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<OAuthConnections>({
    jira: { connected: false, account: null, connectedAt: null },
    googleCalendar: { connected: false, account: null, connectedAt: null },
  });

  // Command bar & modal state
  const [commandOpen, setCommandOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggestedKeyword, setSuggestedKeyword] = useState<string>('');


  const fetchData = async () => {
    try {
      setLoading(true);
      const [linksRes, broadcastsRes, queueRes, connectionsRes, orgRes] = await Promise.all([
        fetch('/api/v1/go-links'),
        fetch('/api/v1/broadcasts'),
        fetch('/api/v1/queue'),
        fetch('/api/v1/oauth/connections'),
        fetch('/api/v1/organization'),
      ]);

      if (orgRes.ok) {
        const data = await orgRes.json();
        if (data.organization) setOrg(data.organization);
      }
      if (linksRes.ok) {
        const data = await linksRes.json();
        setGoLinks(data.go_links || []);
      }
      if (broadcastsRes.ok) {
        const data = await broadcastsRes.json();
        setBroadcasts(data.broadcasts || []);
      }
      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueue(data);
      }
      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        if (data.connections) setConnections(data.connections);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenLink = (link: GoLink, resolvedUrl?: string) => {
    const url = resolvedUrl || interpolateGoLinkUrl(link, null);
    window.open(url, '_blank', 'noopener,noreferrer');

    setGoLinks((prev) =>
      prev.map((l) =>
        l.id === link.id ? { ...l, click_count: l.click_count + 1 } : l
      )
    );

    fetch(`/api/v1/resolve?keyword=${encodeURIComponent(link.keyword)}`).catch(
      (err) => console.error('Failed to resolve link:', err)
    );
  };

  const handleAcknowledgeBroadcast = async (broadcastId: string, pollResponse?: string) => {
    // Optimistically update local state immediately
    setBroadcasts((prev) =>
      prev.map((b) => {
        if (b.id !== broadcastId) return b;
        const updatedPollResults = { ...(b.poll_results || {}) };
        if (pollResponse) {
          updatedPollResults[pollResponse] = (updatedPollResults[pollResponse] || 0) + 1;
        }
        return {
          ...b,
          acknowledged: true,
          user_poll_response: pollResponse || b.user_poll_response,
          read_count: (b.read_count || 0) + 1,
          poll_results: b.poll_options ? updatedPollResults : undefined,
        };
      })
    );

    const res = await fetch(`/api/v1/broadcasts/${broadcastId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poll_response: pollResponse }),
    });

    if (!res.ok) {
      console.error('Failed to record broadcast acknowledgment on server');
    }
  };

  const handleCreateBroadcast = async (input: CreateBroadcastInput) => {
    const res = await fetch('/api/v1/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to post announcement');
    }

    const { broadcast } = await res.json();
    setBroadcasts((prev) => [broadcast, ...prev]);
  };


  const handleCreateGoLink = async (newLinkData: {
    keyword: string;
    target_url: string;
    description?: string;
    default_url?: string | null;
    defaultUrl?: string | null;
  }) => {
    const fallbackUrl = newLinkData.default_url || newLinkData.defaultUrl || null;
    const res = await fetch('/api/v1/go-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: newLinkData.keyword,
        target_url: newLinkData.target_url,
        description: newLinkData.description,
        default_url: fallbackUrl,
        defaultUrl: fallbackUrl,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create go-link');
    }

    const { go_link } = await res.json();
    setGoLinks((prev) => [go_link, ...prev.filter((l) => l.keyword !== go_link.keyword)]);
  };

  const handleOAuthToggle = async (
    provider: 'jira' | 'google_calendar',
    action: 'connect' | 'disconnect'
  ) => {
    const res = await fetch('/api/v1/oauth/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, action }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update OAuth connection');
    }

    const data = await res.json();
    if (data.connections) setConnections(data.connections);
    if (data.queue) setQueue(data.queue);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-surface-highlight/80 bg-surface/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-brand-foreground shadow-md shadow-brand/20">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                Stager
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-brand-subtle text-brand border border-brand-muted font-mono">
                {org?.display_name || org?.name || 'Acme Health'}
              </span>
            </div>
          </div>

          {/* Center search / Command bar trigger button */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex items-center justify-between w-72 md:w-96 px-3 py-1.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-surface-highlight hover:border-brand-muted text-slate-400 hover:text-slate-200 transition-all text-xs"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Jump to go-link or search...</span>
            </span>
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface border border-surface-highlight text-[10px] font-mono text-slate-400">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>

          {/* User profile & quick action */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span>Omnibox Ready</span>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-highlight text-slate-400 hover:text-white border border-surface-highlight transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-surface-elevated">
              <div className="w-7 h-7 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center text-xs font-semibold text-brand">
                AM
              </div>
              <span className="hidden md:inline text-xs font-medium text-slate-300">
                {MOCK_PROFILE.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Banner / Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-surface to-surface-elevated/60 border border-surface-highlight/70">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-brand mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Contextual Workspace Command Center</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Welcome back, Alex.
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Quickly launch company tools, stay aligned with active announcements,
              and triage your daily engineering workflow directly from browser omnibox or here.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSuggestedKeyword('');
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-brand hover:opacity-90 text-brand-foreground transition-all shadow-sm shadow-brand/10"
            >
              <Plus className="w-4 h-4" />
              Add Go-Link
            </button>
            <button
              type="button"
              onClick={fetchData}
              title="Refresh dashboard"
              className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-highlight text-slate-400 hover:text-white border border-surface-highlight transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1. Top Pinned Broadcasts */}
        <BroadcastsWidget
          broadcasts={broadcasts}
          onAcknowledge={handleAcknowledgeBroadcast}
          onOpenCreateModal={() => setBroadcastModalOpen(true)}
        />

        {/* 2. Go-Links Launchpad Grid */}
        <LaunchpadGrid
          goLinks={goLinks}
          onOpenLink={handleOpenLink}
          onRequestCreate={() => {
            setSuggestedKeyword('');
            setCreateModalOpen(true);
          }}
        />

        {/* 3. Personal Triage Widget ("My Queue") */}
        {queue && (
          <MyQueueWidget queue={queue} onOpenSettings={() => setSettingsOpen(true)} />
        )}
      </main>

      {/* Global Command Bar Dialog */}
      <CommandBar
        open={commandOpen}
        onOpenChange={setCommandOpen}
        goLinks={goLinks}
        onSelectLink={handleOpenLink}
        onCreateLinkRequest={(key) => {
          setSuggestedKeyword(key || '');
          setCreateModalOpen(true);
        }}
        onCreateBroadcastRequest={() => setBroadcastModalOpen(true)}
      />

      {/* Create Link Modal */}
      <CreateLinkModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialKeyword={suggestedKeyword}
        onCreated={handleCreateGoLink}
      />

      {/* Create Broadcast Modal */}
      <CreateBroadcastModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        onCreated={handleCreateBroadcast}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        connections={connections}
        onToggle={handleOAuthToggle}
      />

    </div>
  );
}
