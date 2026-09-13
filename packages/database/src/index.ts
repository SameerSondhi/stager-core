import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  GoLink,
  Broadcast,
  BroadcastAcknowledgment,
  Organization,
  Profile,
  PersonalQueue,
  OAuthConnections,
} from './types';
import {
  MOCK_ORGANIZATION,
  MOCK_PROFILE,
  MOCK_GO_LINKS,
  MOCK_BROADCASTS,
  MOCK_PERSONAL_QUEUE,
  LIVE_JIRA_ISSUES,
  LIVE_CALENDAR_EVENTS,
} from './mock-data';

export * from './types';
export * from './mock-data';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && anonKey && !url.includes('dummy')) {
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch {
      return null;
    }
  }

  return null;
}

// In-Memory state for zero-config preview
class InMemoryStore {
  private goLinks: GoLink[] = [...MOCK_GO_LINKS];
  private broadcasts: Broadcast[] = [...MOCK_BROADCASTS];
  private acknowledgments: Set<string> = new Set();
  private oauth: OAuthConnections = {
    jira: { connected: false, account: null, connectedAt: null },
    googleCalendar: { connected: false, account: null, connectedAt: null },
  };

  async getGoLinks(): Promise<GoLink[]> {
    return [...this.goLinks].sort((a, b) => b.click_count - a.click_count);
  }

  async resolveGoLink(keyword: string): Promise<GoLink | null> {
    const cleanKey = keyword.trim().toLowerCase().replace(/^go\//, '').replace(/^\//, '');
    const link = this.goLinks.find(
      (l) => l.keyword.toLowerCase() === cleanKey
    );
    if (link) {
      link.click_count += 1;
      return { ...link };
    }
    return null;
  }

  async createGoLink(
    keyword: string,
    targetUrl: string,
    description?: string
  ): Promise<GoLink> {
    const cleanKey = keyword.trim().toLowerCase().replace(/^go\//, '').replace(/^\//, '');
    const existingIndex = this.goLinks.findIndex(
      (l) => l.keyword.toLowerCase() === cleanKey
    );

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      this.goLinks[existingIndex] = {
        ...this.goLinks[existingIndex],
        target_url: targetUrl,
        description: description || this.goLinks[existingIndex].description,
      };
      return { ...this.goLinks[existingIndex] };
    }

    const newLink: GoLink = {
      id: `g-${Date.now()}`,
      org_id: MOCK_ORGANIZATION.id,
      keyword: cleanKey,
      target_url: targetUrl,
      description: description || null,
      click_count: 0,
      created_by: MOCK_PROFILE.id,
      created_at: now,
    };

    this.goLinks.push(newLink);
    return newLink;
  }

  async getBroadcasts(userId: string = MOCK_PROFILE.id): Promise<Broadcast[]> {
    return this.broadcasts.map((b) => ({
      ...b,
      acknowledged: this.acknowledgments.has(`${b.id}:${userId}`),
    }));
  }

  async acknowledgeBroadcast(
    broadcastId: string,
    userId: string = MOCK_PROFILE.id
  ): Promise<boolean> {
    this.acknowledgments.add(`${broadcastId}:${userId}`);
    return true;
  }

  async getPersonalQueue(): Promise<PersonalQueue> {
    const jiraLive = this.oauth.jira.connected;
    const calendarLive = this.oauth.googleCalendar.connected;

    return {
      jiraIssues: jiraLive ? LIVE_JIRA_ISSUES : MOCK_PERSONAL_QUEUE.jiraIssues,
      pullRequests: MOCK_PERSONAL_QUEUE.pullRequests,
      calendarEvents: calendarLive
        ? LIVE_CALENDAR_EVENTS
        : MOCK_PERSONAL_QUEUE.calendarEvents,
      sources: {
        jira: jiraLive ? 'live' : 'mock',
        calendar: calendarLive ? 'live' : 'mock',
        pullRequests: 'mock',
      },
    };
  }

  getOAuthConnections(): OAuthConnections {
    return {
      jira: { ...this.oauth.jira },
      googleCalendar: { ...this.oauth.googleCalendar },
    };
  }

  setOAuthConnection(
    provider: 'jira' | 'google_calendar',
    connected: boolean
  ): OAuthConnections {
    const now = new Date().toISOString();
    if (provider === 'jira') {
      this.oauth.jira = connected
        ? {
            connected: true,
            account: MOCK_PROFILE.email,
            connectedAt: now,
          }
        : { connected: false, account: null, connectedAt: null };
    } else {
      this.oauth.googleCalendar = connected
        ? {
            connected: true,
            account: MOCK_PROFILE.email,
            connectedAt: now,
          }
        : { connected: false, account: null, connectedAt: null };
    }
    return this.getOAuthConnections();
  }
}

// Global singleton in-memory store for dev sessions
const globalStore = new InMemoryStore();

export const stagerDb = {
  async getGoLinks(): Promise<GoLink[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('go_links')
        .select('*')
        .order('click_count', { ascending: false });
      if (!error && data) return data as GoLink[];
    }
    return globalStore.getGoLinks();
  },

  async resolveGoLink(keyword: string): Promise<GoLink | null> {
    const cleanKey = keyword.trim().toLowerCase().replace(/^go\//, '').replace(/^\//, '');
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('go_links')
        .select('*')
        .ilike('keyword', cleanKey)
        .maybeSingle();

      if (!error && data) {
        // Increment click count asynchronously
        await supabase
          .from('go_links')
          .update({ click_count: (data.click_count || 0) + 1 })
          .eq('id', data.id);

        return data as GoLink;
      }
    }
    return globalStore.resolveGoLink(cleanKey);
  },

  async createGoLink(
    keyword: string,
    targetUrl: string,
    description?: string
  ): Promise<GoLink> {
    const cleanKey = keyword.trim().toLowerCase().replace(/^go\//, '').replace(/^\//, '');
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('go_links')
        .insert({
          org_id: MOCK_ORGANIZATION.id,
          keyword: cleanKey,
          target_url: targetUrl,
          description: description || null,
          created_by: MOCK_PROFILE.id,
        })
        .select()
        .single();

      if (!error && data) return data as GoLink;
    }
    return globalStore.createGoLink(cleanKey, targetUrl, description);
  },

  async getBroadcasts(userId: string = MOCK_PROFILE.id): Promise<Broadcast[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: broadcasts, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });

      if (!error && broadcasts) {
        const { data: acks } = await supabase
          .from('broadcast_acknowledgments')
          .select('broadcast_id')
          .eq('user_id', userId);

        const ackSet = new Set((acks || []).map((a) => a.broadcast_id));
        return (broadcasts as Broadcast[]).map((b) => ({
          ...b,
          acknowledged: ackSet.has(b.id),
        }));
      }
    }
    return globalStore.getBroadcasts(userId);
  },

  async acknowledgeBroadcast(
    broadcastId: string,
    userId: string = MOCK_PROFILE.id
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('broadcast_acknowledgments')
        .upsert({ broadcast_id: broadcastId, user_id: userId });
      if (!error) return true;
    }
    return globalStore.acknowledgeBroadcast(broadcastId, userId);
  },

  async getPersonalQueue(): Promise<PersonalQueue> {
    return globalStore.getPersonalQueue();
  },

  getOAuthConnections(): OAuthConnections {
    return globalStore.getOAuthConnections();
  },

  setOAuthConnection(
    provider: 'jira' | 'google_calendar',
    connected: boolean
  ): OAuthConnections {
    return globalStore.setOAuthConnection(provider, connected);
  },
};
