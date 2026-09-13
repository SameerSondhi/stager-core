import { Organization, Profile, GoLink, Broadcast, PersonalQueue, JiraIssue, CalendarEvent } from './types';

export const MOCK_ORGANIZATION: Organization = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Acme Corp',
  slug: 'acme',
  brand_color: '#10b981',
  display_name: 'Acme Health',
  logo_url: null,
  created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
};

export const MOCK_PROFILE: Profile = {
  id: 'u00000000-0000-0000-0000-000000000001',
  org_id: MOCK_ORGANIZATION.id,
  email: 'alex@acme.internal',
  role: 'lead_engineer',
  created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
};

export const MOCK_GO_LINKS: GoLink[] = [
  {
    id: 'g0000000-0000-0000-0000-000000000001',
    org_id: MOCK_ORGANIZATION.id,
    keyword: 'github',
    target_url: 'https://github.com/acme-corp',
    description: 'Acme Core GitHub Repositories and monorepos',
    click_count: 421,
    created_by: MOCK_PROFILE.id,
    created_at: new Date('2026-01-10T10:00:00Z').toISOString(),
  },
  {
    id: 'g0000000-0000-0000-0000-000000000002',
    org_id: MOCK_ORGANIZATION.id,
    keyword: 'docs',
    target_url: 'https://docs.acme.internal',
    description: 'Internal Architecture & Engineering RFC Documentation',
    click_count: 318,
    created_by: MOCK_PROFILE.id,
    created_at: new Date('2026-01-12T14:30:00Z').toISOString(),
  },
  {
    id: 'g0000000-0000-0000-0000-000000000003',
    org_id: MOCK_ORGANIZATION.id,
    keyword: 'standup',
    target_url: 'https://meet.google.com/acme-standup',
    description: 'Daily Morning Engineering Sync & Standup Room',
    click_count: 294,
    created_by: MOCK_PROFILE.id,
    created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
  },
  {
    id: 'g0000000-0000-0000-0000-000000000004',
    org_id: MOCK_ORGANIZATION.id,
    keyword: 'jira',
    target_url: 'https://acme.atlassian.net',
    description: 'Active Sprint Boards, Epics & Incident Tracker',
    click_count: 240,
    created_by: MOCK_PROFILE.id,
    created_at: new Date('2026-01-20T11:20:00Z').toISOString(),
  },
  {
    id: 'g0000000-0000-0000-0000-000000000005',
    org_id: MOCK_ORGANIZATION.id,
    keyword: 'design',
    target_url: 'https://www.figma.com/@acme',
    description: 'Company Design System, Token Specs & Figma UI Kit',
    click_count: 185,
    created_by: MOCK_PROFILE.id,
    created_at: new Date('2026-02-01T16:45:00Z').toISOString(),
  },
];

export const MOCK_BROADCASTS: Broadcast[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    org_id: MOCK_ORGANIZATION.id,
    title: 'Q3 Cloud Infrastructure Maintenance Window',
    content: 'Upgrading core production PostgreSQL read replicas and Kubernetes node pools on **Saturday at 10:00 PM UTC**. Expect momentary read-only windows of ~2-3 minutes. SRE team on call in `#infra-war-room`.',
    department: 'Engineering',
    author_role: 'Staff SRE',
    is_pinned: true,
    expires_at: new Date('2026-10-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-09-10T08:00:00Z').toISOString(),
    acknowledged: false,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    org_id: MOCK_ORGANIZATION.id,
    title: 'All-Hands Company Strategy & Stager GA Milestone',
    content: 'Join the executive team this **Thursday at 2:00 PM EST** for company-wide updates, product launch showcases, and live Q&A. Remote attendees join via `go/allhands`.',
    department: 'All',
    author_role: 'Chief of Staff',
    is_pinned: true,
    expires_at: new Date('2026-10-15T00:00:00Z').toISOString(),
    created_at: new Date('2026-09-11T12:00:00Z').toISOString(),
    acknowledged: false,
  },
];

export const MOCK_PERSONAL_QUEUE: PersonalQueue = {
  jiraIssues: [
    {
      id: 'jira-1',
      key: 'STG-204',
      summary: 'Implement omnibox prefix keyword routing in Chrome extension',
      priority: 'P0',
      status: 'In Progress',
      url: 'https://acme.atlassian.net/browse/STG-204',
    },
    {
      id: 'jira-2',
      key: 'INFRA-819',
      summary: 'Scale Redis read caches for enterprise go-link high frequency resolvers',
      priority: 'P1',
      status: 'Under Review',
      url: 'https://acme.atlassian.net/browse/INFRA-819',
    },
    {
      id: 'jira-3',
      key: 'AUTH-102',
      summary: 'Enforce SCIM multi-tenant role directory synchronization',
      priority: 'P2',
      status: 'To Do',
      url: 'https://acme.atlassian.net/browse/AUTH-102',
    },
  ],
  pullRequests: [
    {
      id: 'pr-1',
      repo: 'stager/core-api',
      title: 'feat: add instant fuzzy matching and CORS options endpoint',
      author: 'sarah.chen',
      openSince: '3h ago',
      url: 'https://github.com/acme-corp/stager-core/pull/142',
      commentsCount: 4,
    },
    {
      id: 'pr-2',
      repo: 'acme/ui-tokens',
      title: 'refactor: dark mode high density badge contrast updates',
      author: 'marcus.v',
      openSince: '1d ago',
      url: 'https://github.com/acme-corp/ui-tokens/pull/89',
      commentsCount: 2,
    },
  ],
  calendarEvents: [
    {
      id: 'cal-1',
      title: 'Daily Core Engineering Sync & Standup',
      startTime: '10:00 AM',
      timeLabel: 'in 15 mins',
      meetingUrl: 'https://meet.google.com/acme-standup',
      platform: 'Google Meet',
    },
    {
      id: 'cal-2',
      title: 'Architecture Review: Multi-tenant Cache Invalidation',
      startTime: '2:30 PM',
      timeLabel: 'today at 2:30 PM',
      meetingUrl: 'https://meet.google.com/acme-arch',
      platform: 'Google Meet',
    },
  ],
  sources: {
    jira: 'mock',
    calendar: 'mock',
    pullRequests: 'mock',
  },
};

/** Distinct live-feed stubs used once Jira / Calendar OAuth is connected. */
export const LIVE_JIRA_ISSUES: JiraIssue[] = [
  {
    id: 'jira-live-1',
    key: 'STG-441',
    summary: 'Wire Jira Cloud OAuth into personal queue live feed',
    priority: 'P0',
    status: 'In Progress',
    url: 'https://acme.atlassian.net/browse/STG-441',
  },
  {
    id: 'jira-live-2',
    key: 'STG-448',
    summary: 'Paginate assigned issues from /rest/api/3/search/jql',
    priority: 'P1',
    status: 'To Do',
    url: 'https://acme.atlassian.net/browse/STG-448',
  },
  {
    id: 'jira-live-3',
    key: 'SEC-77',
    summary: 'Rotate Atlassian API token stored in Stager vault',
    priority: 'P1',
    status: 'Blocked',
    url: 'https://acme.atlassian.net/browse/SEC-77',
  },
];

export const LIVE_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-live-1',
    title: 'Jira + Calendar OAuth pairing review',
    startTime: '11:15 AM',
    timeLabel: 'in 8 mins',
    meetingUrl: 'https://meet.google.com/stager-oauth',
    platform: 'Google Meet',
  },
  {
    id: 'cal-live-2',
    title: 'Sprint planning — Queue live feeds',
    startTime: '1:00 PM',
    timeLabel: 'today at 1:00 PM',
    meetingUrl: 'https://meet.google.com/stager-sprint',
    platform: 'Google Meet',
  },
  {
    id: 'cal-live-3',
    title: '1:1 with Sarah (Jira admin)',
    startTime: '4:45 PM',
    timeLabel: 'today at 4:45 PM',
    meetingUrl: 'https://meet.google.com/acme-1-1',
    platform: 'Google Meet',
  },
];
