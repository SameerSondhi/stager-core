export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  email: string;
  role: 'admin' | 'lead_engineer' | 'member' | string;
  created_at: string;
}

export interface GoLink {
  id: string;
  org_id: string;
  keyword: string;
  target_url: string;
  description?: string | null;
  click_count: number;
  created_by?: string | null;
  created_at: string;
}

export interface Broadcast {
  id: string;
  org_id: string;
  title: string;
  content: string;
  department: string;
  author_role?: string | null;
  is_pinned: boolean;
  expires_at?: string | null;
  created_at: string;
  acknowledged?: boolean;
}

export interface BroadcastAcknowledgment {
  id: string;
  broadcast_id: string;
  user_id: string;
  acknowledged_at: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'In Progress' | 'Under Review' | 'To Do' | 'Blocked';
  url: string;
}

export interface PullRequest {
  id: string;
  repo: string;
  title: string;
  author: string;
  openSince: string;
  url: string;
  commentsCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  timeLabel: string;
  meetingUrl: string;
  platform: 'Google Meet' | 'Zoom' | 'Slack Huddle';
}

export interface PersonalQueue {
  jiraIssues: JiraIssue[];
  pullRequests: PullRequest[];
  calendarEvents: CalendarEvent[];
  sources: QueueSources;
}

export type QueueFeed = 'mock' | 'live';

export interface OAuthConnection {
  connected: boolean;
  account?: string | null;
  connectedAt?: string | null;
}

export interface OAuthConnections {
  jira: OAuthConnection;
  googleCalendar: OAuthConnection;
}

export interface QueueSources {
  jira: QueueFeed;
  calendar: QueueFeed;
  pullRequests: QueueFeed;
}
