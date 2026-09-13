import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  GoLink,
  Broadcast,
  BroadcastAcknowledgment,
  CreateBroadcastInput,
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
import { parseGoLinkInput } from './go-link-params';

export * from './types';
export * from './mock-data';
export * from './go-link-params';

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

interface StoredAck {
  userId: string;
  pollResponse?: string | null;
  acknowledgedAt: string;
}

// In-Memory state for zero-config preview
class InMemoryStore {
  private goLinks: GoLink[] = [...MOCK_GO_LINKS];
  private broadcasts: Broadcast[] = [...MOCK_BROADCASTS];
  private acknowledgments: Map<string, StoredAck[]> = new Map();
  private oauth: OAuthConnections = {
    jira: { connected: false, account: null, connectedAt: null },
    googleCalendar: { connected: false, account: null, connectedAt: null },
  };

  async getOrganization(orgId: string = MOCK_ORGANIZATION.id): Promise<Organization> {
    return { ...MOCK_ORGANIZATION };
  }

  async getGoLinks(): Promise<GoLink[]> {
    return [...this.goLinks].sort((a, b) => b.click_count - a.click_count);
  }

  async resolveGoLink(keyword: string): Promise<GoLink | null> {
    const { keyword: cleanKey } = parseGoLinkInput(keyword);
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
    description?: string,
    defaultUrl?: string
  ): Promise<GoLink> {
    const { keyword: cleanKey } = parseGoLinkInput(keyword);
    const existingIndex = this.goLinks.findIndex(
      (l) => l.keyword.toLowerCase() === cleanKey
    );

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      this.goLinks[existingIndex] = {
        ...this.goLinks[existingIndex],
        target_url: targetUrl,
        default_url: defaultUrl !== undefined ? (defaultUrl || null) : this.goLinks[existingIndex].default_url,
        description: description || this.goLinks[existingIndex].description,
      };
      return { ...this.goLinks[existingIndex] };
    }

    const newLink: GoLink = {
      id: `g-${Date.now()}`,
      org_id: MOCK_ORGANIZATION.id,
      keyword: cleanKey,
      target_url: targetUrl,
      default_url: defaultUrl || null,
      description: description || null,
      click_count: 0,
      created_by: MOCK_PROFILE.id,
      created_at: now,
    };

    this.goLinks.push(newLink);
    return newLink;
  }

  async getBroadcasts(userId: string = MOCK_PROFILE.id, department?: string): Promise<Broadcast[]> {
    const nowTime = Date.now();
    return this.broadcasts
      .filter((b) => {
        // Expiration check
        if (b.expires_at && new Date(b.expires_at).getTime() <= nowTime) {
          return false;
        }
        // Audience / department check
        if (department && department !== 'All' && b.department !== 'All') {
          if (b.department.toLowerCase() !== department.toLowerCase()) {
            return false;
          }
        }
        return true;
      })
      .map((b) => {
        const acks = this.acknowledgments.get(b.id) || [];
        const userAck = acks.find((a) => a.userId === userId);
        const userAcked = !!userAck;

        // Calculate dynamic poll results if poll options exist
        let dynamicPollResults: Record<string, number> | undefined = undefined;
        if (b.poll_options && Array.isArray(b.poll_options)) {
          dynamicPollResults = {};
          for (const opt of b.poll_options) {
            dynamicPollResults[opt] = b.poll_results?.[opt] || 0;
          }
        }

        return {
          ...b,
          acknowledged: userAcked,
          acknowledged_at: userAck?.acknowledgedAt || null,
          user_poll_response: userAck?.pollResponse || null,
          read_count: Math.max(b.read_count ?? 0, acks.length),
          total_targeted: b.total_targeted || (b.department === 'All' ? 120 : 48),
          poll_results: dynamicPollResults,
        };
      });
  }

  async acknowledgeBroadcast(
    broadcastId: string,
    userId: string = MOCK_PROFILE.id,
    pollResponse?: string | null
  ): Promise<boolean> {
    const b = this.broadcasts.find((item) => item.id === broadcastId);
    if (!b) return false;

    let acks = this.acknowledgments.get(broadcastId);
    if (!acks) {
      acks = [];
      this.acknowledgments.set(broadcastId, acks);
    }

    const existingIndex = acks.findIndex((a) => a.userId === userId);
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      const oldResponse = acks[existingIndex].pollResponse;
      if (oldResponse && b.poll_results && b.poll_results[oldResponse] > 0) {
        b.poll_results[oldResponse]--;
      }
      acks[existingIndex] = {
        userId,
        pollResponse: pollResponse || null,
        acknowledgedAt: nowIso,
      };
    } else {
      acks.push({
        userId,
        pollResponse: pollResponse || null,
        acknowledgedAt: nowIso,
      });
      b.read_count = (b.read_count ?? 0) + 1;
    }

    if (pollResponse) {
      b.poll_results = b.poll_results || {};
      b.poll_results[pollResponse] = (b.poll_results[pollResponse] ?? 0) + 1;
    }

    return true;
  }

  async createBroadcast(input: CreateBroadcastInput): Promise<Broadcast> {
    const now = new Date();
    let expiresAt: string;
    if (input.expires_at) {
      expiresAt = input.expires_at;
    } else if (input.expires_in_hours) {
      expiresAt = new Date(now.getTime() + input.expires_in_hours * 3600 * 1000).toISOString();
    } else {
      expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();
    }

    const cleanPollOptions = input.poll_options && input.poll_options.length > 0
      ? input.poll_options.filter((opt) => typeof opt === 'string' && opt.trim().length > 0)
      : null;

    const pollResults = cleanPollOptions && cleanPollOptions.length > 0
      ? Object.fromEntries(cleanPollOptions.map((opt) => [opt, 0]))
      : undefined;

    const newBroadcast: Broadcast = {
      id: `b-${Date.now()}`,
      org_id: MOCK_ORGANIZATION.id,
      title: input.title.trim(),
      content: input.content.trim(),
      department: input.department || 'All',
      author_name: input.author_name || 'Alex Chen',
      author_role: input.author_role || 'Lead Engineer',
      poll_options: cleanPollOptions && cleanPollOptions.length > 0 ? cleanPollOptions : null,
      is_pinned: input.is_pinned ?? true,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      acknowledged: false,
      read_count: 0,
      total_targeted: input.department && input.department !== 'All' ? 48 : 120,
      poll_results: pollResults,
    };

    this.broadcasts.unshift(newBroadcast);
    return newBroadcast;
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
  async getOrganization(orgId: string = MOCK_ORGANIZATION.id): Promise<Organization> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();
      if (!error && data) return data as Organization;
    }
    return globalStore.getOrganization(orgId);
  },

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
    const { keyword: cleanKey } = parseGoLinkInput(keyword);
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
    description?: string,
    defaultUrl?: string
  ): Promise<GoLink> {
    const { keyword: cleanKey } = parseGoLinkInput(keyword);
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('go_links')
        .insert({
          org_id: MOCK_ORGANIZATION.id,
          keyword: cleanKey,
          target_url: targetUrl,
          default_url: defaultUrl || null,
          description: description || null,
          created_by: MOCK_PROFILE.id,
        })
        .select()
        .single();

      if (!error && data) return data as GoLink;
    }
    return globalStore.createGoLink(cleanKey, targetUrl, description, defaultUrl);
  },

  async getBroadcasts(userId: string = MOCK_PROFILE.id, department?: string): Promise<Broadcast[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      let query = supabase
        .from('broadcasts')
        .select('*')
        .eq('is_pinned', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (department && department !== 'All') {
        query = query.or(`department.eq.All,department.eq.${department}`);
      }

      const { data: broadcasts, error } = await query;

      if (!error && broadcasts) {
        const { data: acks } = await supabase
          .from('broadcast_acknowledgments')
          .select('*');

        return (broadcasts as Broadcast[]).map((b) => {
          const broadcastAcks = (acks || []).filter((a) => a.broadcast_id === b.id);
          const userAck = broadcastAcks.find((a) => a.user_id === userId);

          let dynamicPollResults: Record<string, number> | undefined = undefined;
          if (b.poll_options && Array.isArray(b.poll_options)) {
            dynamicPollResults = {};
            b.poll_options.forEach((opt: string) => {
              dynamicPollResults![opt] = 0;
            });
            broadcastAcks.forEach((a) => {
              if (a.poll_response && dynamicPollResults![a.poll_response] !== undefined) {
                dynamicPollResults![a.poll_response]++;
              }
            });
          }

          return {
            ...b,
            acknowledged: !!userAck,
            acknowledged_at: userAck?.acknowledged_at || null,
            user_poll_response: userAck?.poll_response || null,
            read_count: broadcastAcks.length,
            total_targeted: b.department === 'All' ? 120 : 48,
            poll_results: dynamicPollResults,
          };
        });
      }
    }
    return globalStore.getBroadcasts(userId, department);
  },

  async acknowledgeBroadcast(
    broadcastId: string,
    userId: string = MOCK_PROFILE.id,
    pollResponse?: string | null
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('broadcast_acknowledgments')
        .upsert(
          {
            broadcast_id: broadcastId,
            user_id: userId,
            poll_response: pollResponse || null,
            acknowledged_at: new Date().toISOString(),
          },
          { onConflict: 'broadcast_id,user_id' }
        );
      if (!error) return true;
    }
    return globalStore.acknowledgeBroadcast(broadcastId, userId, pollResponse);
  },

  async createBroadcast(input: CreateBroadcastInput): Promise<Broadcast> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const now = new Date();
      const expiresAt =
        input.expires_at ||
        (input.expires_in_hours
          ? new Date(now.getTime() + input.expires_in_hours * 3600 * 1000).toISOString()
          : new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString());

      const cleanPollOptions =
        input.poll_options && input.poll_options.length > 0
          ? input.poll_options.filter((opt) => typeof opt === 'string' && opt.trim().length > 0)
          : null;

      const { data, error } = await supabase
        .from('broadcasts')
        .insert({
          org_id: MOCK_ORGANIZATION.id,
          title: input.title.trim(),
          content: input.content.trim(),
          department: input.department || 'All',
          author_name: input.author_name || 'Alex Chen',
          author_role: input.author_role || 'Lead Engineer',
          poll_options: cleanPollOptions,
          is_pinned: input.is_pinned ?? true,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          acknowledged: false,
          read_count: 0,
          total_targeted: input.department && input.department !== 'All' ? 48 : 120,
          poll_results: cleanPollOptions
            ? Object.fromEntries(cleanPollOptions.map((opt) => [opt, 0]))
            : undefined,
        } as Broadcast;
      }
    }
    return globalStore.createBroadcast(input);
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
