export {};

const API_BASE = 'http://localhost:3000';

interface Organization {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  display_name?: string | null;
  logo_url?: string | null;
}

interface GoLinkItem {
  id: string;
  keyword: string;
  target_url: string;
  description?: string;
  click_count: number;
}

interface BroadcastItem {
  id: string;
  title: string;
  content: string;
  department: string;
  author_role?: string;
  is_pinned: boolean;
  acknowledged?: boolean;
}

interface JiraIssueItem {
  id: string;
  key: string;
  summary: string;
  priority: string;
  status: string;
  url: string;
}

interface PullRequestItem {
  id: string;
  repo: string;
  title: string;
  author: string;
  openSince: string;
  url: string;
}

interface CalendarEventItem {
  id: string;
  title: string;
  startTime: string;
  timeLabel: string;
  meetingUrl: string;
}

interface QueueData {
  jiraIssues: JiraIssueItem[];
  pullRequests: PullRequestItem[];
  calendarEvents: CalendarEventItem[];
}

const FALLBACK_LINKS: GoLinkItem[] = [
  { id: '1', keyword: 'github', target_url: 'https://github.com/acme-corp', description: 'Acme Core GitHub', click_count: 421 },
  { id: '2', keyword: 'docs', target_url: 'https://docs.acme.internal', description: 'Internal Docs', click_count: 318 },
  { id: '3', keyword: 'standup', target_url: 'https://meet.google.com/acme-standup', description: 'Daily Sync', click_count: 294 },
  { id: '4', keyword: 'jira', target_url: 'https://acme.atlassian.net', description: 'Active Sprints', click_count: 240 },
  { id: '5', keyword: 'design', target_url: 'https://www.figma.com/@acme', description: 'Figma UI Kit', click_count: 185 },
];

let allLinks: GoLinkItem[] = [...FALLBACK_LINKS];
let queueData: QueueData = { jiraIssues: [], pullRequests: [], calendarEvents: [] };
let activeTab: 'jira' | 'prs' | 'cal' = 'jira';

function hexToRgba(hex: string, alpha: number): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return `rgba(16, 185, 129, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function loadOrganization() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/organization`);
    if (res.ok) {
      const data = await res.json();
      const org: Organization = data.organization;
      if (org) {
        const brandPrimary = org.brand_color || '#10b981';
        const brandMuted = hexToRgba(brandPrimary, 0.2);
        const brandSubtle = hexToRgba(brandPrimary, 0.08);

        // Inject dynamic CSS variables onto sidepanel root
        document.documentElement.style.setProperty('--brand-primary', brandPrimary);
        document.documentElement.style.setProperty('--brand-muted', brandMuted);
        document.documentElement.style.setProperty('--brand-subtle', brandSubtle);

        const displayName = org.display_name || org.name || 'Acme Health';
        const initial = displayName.charAt(0).toUpperCase();

        const avatarEl = document.getElementById('orgAvatar');
        if (avatarEl) avatarEl.innerText = initial;

        const titleEl = document.getElementById('orgTitle');
        if (titleEl) titleEl.innerText = `${displayName} // Mission Control`;

        const badgeEl = document.getElementById('tenantBadge');
        if (badgeEl) badgeEl.innerText = displayName;
      }
    }
  } catch (e) {
    console.log('Unable to reach organization API, using default tokens', e);
  }
}

async function loadBroadcasts() {
  const container = document.getElementById('broadcastContainer');
  const card = document.getElementById('broadcastCard');
  if (!container || !card) return;

  try {
    const res = await fetch(`${API_BASE}/api/v1/broadcasts`);
    if (res.ok) {
      const data = await res.json();
      const broadcasts: BroadcastItem[] = data.broadcasts || [];
      const pinned = broadcasts.find((b) => b.is_pinned);

      if (pinned) {
        container.style.display = 'block';
        card.innerHTML = `
          <div class="broadcast-header">
            <span class="dept-badge">${pinned.department}</span>
            <button id="sideAckBtn" class="ack-btn ${pinned.acknowledged ? 'acked' : ''}">
              ${pinned.acknowledged ? '✓ Acknowledged' : 'Acknowledge'}
            </button>
          </div>
          <div style="font-weight: 600; font-size: 12px; color: #f8fafc;">${pinned.title}</div>
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.3;">${pinned.content}</div>
        `;

        const ackBtn = document.getElementById('sideAckBtn');
        if (ackBtn && !pinned.acknowledged) {
          ackBtn.addEventListener('click', async () => {
            ackBtn.innerText = 'Saving...';
            await fetch(`${API_BASE}/api/v1/broadcasts/${pinned.id}/acknowledge`, { method: 'POST' });
            ackBtn.className = 'ack-btn acked';
            ackBtn.innerText = '✓ Acknowledged';
          });
        }
      } else {
        container.style.display = 'none';
      }
    }
  } catch {
    container.style.display = 'none';
  }
}

async function loadGoLinks() {
  const linkCountEl = document.getElementById('linkCount');

  try {
    const res = await fetch(`${API_BASE}/api/v1/go-links`);
    if (res.ok) {
      const data = await res.json();
      if (data.go_links && data.go_links.length > 0) {
        allLinks = data.go_links;
      }
    }
  } catch (e) {
    console.log('Using fallback links in sidepanel');
  }

  if (linkCountEl) {
    linkCountEl.innerText = `${allLinks.length} links`;
  }
  renderLinks(allLinks);
}

function renderLinks(links: GoLinkItem[]) {
  const container = document.getElementById('linksList');
  if (!container) return;
  container.innerHTML = '';

  links.slice(0, 6).forEach((link) => {
    const div = document.createElement('div');
    div.className = 'link-item';
    div.innerHTML = `
      <div style="min-width: 0;">
        <div class="link-key">go/${link.keyword}</div>
        <div class="link-desc">${link.description || link.target_url}</div>
      </div>
      <span style="font-size: 10px; color: #64748b; font-family: monospace; shrink: 0;">${link.click_count} ↗</span>
    `;

    div.addEventListener('click', () => {
      chrome.tabs.create({ url: link.target_url });
      fetch(`${API_BASE}/api/v1/resolve?keyword=${encodeURIComponent(link.keyword)}`).catch(() => {});
    });

    container.appendChild(div);
  });
}

async function loadQueue() {
  try {
    const qRes = await fetch(`${API_BASE}/api/v1/queue`);
    if (qRes.ok) {
      queueData = await qRes.json();
    }
  } catch {
    queueData = {
      jiraIssues: [
        { id: '1', key: 'STG-204', summary: 'Implement omnibox prefix keyword routing', priority: 'P0', status: 'In Progress', url: 'https://acme.atlassian.net/browse/STG-204' },
        { id: '2', key: 'INFRA-819', summary: 'Scale Redis read caches for resolvers', priority: 'P1', status: 'Under Review', url: 'https://acme.atlassian.net/browse/INFRA-819' },
      ],
      pullRequests: [
        { id: '1', repo: 'stager/core-api', title: 'feat: add instant fuzzy matching', author: 'sarah.c', openSince: '3h ago', url: 'https://github.com/acme-corp/stager-core/pull/142' },
      ],
      calendarEvents: [
        { id: '1', title: 'Daily Core Engineering Sync', startTime: '10:00 AM', timeLabel: 'in 15m', meetingUrl: 'https://meet.google.com/acme-standup' },
      ],
    };
  }

  const jiraCount = document.getElementById('jiraCount');
  const prsCount = document.getElementById('prsCount');
  const calCount = document.getElementById('calCount');

  if (jiraCount) jiraCount.innerText = String(queueData.jiraIssues?.length || 0);
  if (prsCount) prsCount.innerText = String(queueData.pullRequests?.length || 0);
  if (calCount) calCount.innerText = String(queueData.calendarEvents?.length || 0);

  renderQueueContent();
}

function renderQueueContent() {
  const container = document.getElementById('queueContent');
  if (!container) return;
  container.innerHTML = '';

  if (activeTab === 'jira') {
    (queueData.jiraIssues || []).forEach((issue) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.innerHTML = `
        <div class="queue-item-header">
          <span class="queue-key">${issue.key}</span>
          <span style="font-size: 10px; color: #f59e0b; font-weight: 600;">${issue.priority}</span>
        </div>
        <div class="queue-summary">${issue.summary}</div>
      `;
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: issue.url });
      });
      container.appendChild(item);
    });
  } else if (activeTab === 'prs') {
    (queueData.pullRequests || []).forEach((pr) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.innerHTML = `
        <div class="queue-item-header">
          <span class="queue-key">${pr.repo}</span>
          <span style="font-size: 10px; color: #94a3b8;">${pr.openSince}</span>
        </div>
        <div class="queue-summary">${pr.title}</div>
      `;
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: pr.url });
      });
      container.appendChild(item);
    });
  } else if (activeTab === 'cal') {
    (queueData.calendarEvents || []).forEach((evt) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.innerHTML = `
        <div class="queue-item-header">
          <span style="font-weight: 600; font-size: 11px; color: #f8fafc;">${evt.title}</span>
          <span style="font-size: 10px; color: #f59e0b;">${evt.timeLabel}</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8;">Starts at ${evt.startTime}</div>
        <a href="${evt.meetingUrl}" target="_blank" class="join-btn">Join Video</a>
      `;
      container.appendChild(item);
    });
  }
}

// Tab navigation listeners
function setupTabs() {
  const tabJira = document.getElementById('tabJira');
  const tabPrs = document.getElementById('tabPrs');
  const tabCal = document.getElementById('tabCal');

  tabJira?.addEventListener('click', () => {
    activeTab = 'jira';
    tabJira.className = 'queue-tab active';
    if (tabPrs) tabPrs.className = 'queue-tab';
    if (tabCal) tabCal.className = 'queue-tab';
    renderQueueContent();
  });

  tabPrs?.addEventListener('click', () => {
    activeTab = 'prs';
    tabPrs.className = 'queue-tab active';
    if (tabJira) tabJira.className = 'queue-tab';
    if (tabCal) tabCal.className = 'queue-tab';
    renderQueueContent();
  });

  tabCal?.addEventListener('click', () => {
    activeTab = 'cal';
    tabCal.className = 'queue-tab active';
    if (tabJira) tabJira.className = 'queue-tab';
    if (tabPrs) tabPrs.className = 'queue-tab';
    renderQueueContent();
  });
}

// Search filtering listener
const searchInput = document.getElementById('sideSearch') as HTMLInputElement;
searchInput?.addEventListener('input', (e) => {
  const q = (e.target as HTMLInputElement).value.toLowerCase().trim();
  if (!q) {
    renderLinks(allLinks);
    return;
  }
  const filtered = allLinks.filter(
    (l) => l.keyword.toLowerCase().includes(q) || (l.description && l.description.toLowerCase().includes(q))
  );
  renderLinks(filtered);
});

async function init() {
  setupTabs();
  await loadOrganization();
  await Promise.all([loadBroadcasts(), loadGoLinks(), loadQueue()]);
}

init();
