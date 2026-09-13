// Stager Background Service Worker (Manifest V3)

const DEFAULT_RESOLVER_BASE = 'http://localhost:3000';
const GO_LINKS_CACHE_KEY = 'stagerGoLinksTop50';
const GO_LINKS_SYNCED_AT_KEY = 'stagerGoLinksSyncedAt';
const SYNC_ALARM_NAME = 'stagerSyncGoLinks';
const SYNC_PERIOD_MINUTES = 5;
const TOP_LINK_LIMIT = 50;

interface CachedGoLink {
  keyword: string;
  target_url: string;
  description?: string | null;
  click_count?: number;
}

// Enable side panel to open upon clicking the toolbar icon
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error('Failed to set side panel behavior:', err));
}

schedulePeriodicSync();

chrome.runtime.onInstalled.addListener(() => {
  schedulePeriodicSync();
  void syncTopGoLinks();
});

chrome.runtime.onStartup.addListener(() => {
  schedulePeriodicSync();
  void syncTopGoLinks();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    void syncTopGoLinks();
  }
});

// Warm the cache as soon as the user starts typing in the omnibox
chrome.omnibox.onInputStarted.addListener(() => {
  void syncTopGoLinks();
});

// Handle Omnibox input: "go <keyword>"
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const cleanKeyword = text.trim().toLowerCase().replace(/^go\//, '').replace(/^\//, '');

  if (!cleanKeyword) {
    navigate(DEFAULT_RESOLVER_BASE, disposition);
    return;
  }

  const cached = await resolveFromCache(cleanKeyword);
  if (cached?.target_url) {
    navigate(cached.target_url, disposition);
    return;
  }

  try {
    const resolveUrl = `${DEFAULT_RESOLVER_BASE}/api/v1/resolve?keyword=${encodeURIComponent(
      cleanKeyword
    )}`;
    const response = await fetch(resolveUrl);

    if (response.ok) {
      const data = await response.json();
      if (data.found && data.target_url) {
        navigate(data.target_url, disposition);
        return;
      }
    }

    // Fallback: Link not found, navigate to web dashboard to create it
    const searchUrl = `${DEFAULT_RESOLVER_BASE}/?create=${encodeURIComponent(cleanKeyword)}`;
    navigate(searchUrl, disposition);
  } catch (error) {
    console.error('Stager omnibox resolution error:', error);
    // If backend is down or unreachable, navigate to fallback
    navigate(`${DEFAULT_RESOLVER_BASE}/?search=${encodeURIComponent(cleanKeyword)}`, disposition);
  }
});

// Provide suggested autocompletion in omnibox dropdown while typing
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const query = text.trim().toLowerCase().replace(/^go\//, '');
  if (!query) return;

  const cached = await readCachedGoLinks();
  if (cached.length > 0) {
    suggest(toOmniboxSuggestions(cached, query));
    return;
  }

  try {
    const res = await fetch(`${DEFAULT_RESOLVER_BASE}/api/v1/go-links`);
    if (res.ok) {
      const { go_links } = await res.json();
      suggest(toOmniboxSuggestions(go_links || [], query));
    }
  } catch {
    // Offline or server not ready; silent fallback
  }
});

function schedulePeriodicSync() {
  if (!chrome.alarms) return;
  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_PERIOD_MINUTES });
}

async function syncTopGoLinks(): Promise<void> {
  try {
    const res = await fetch(`${DEFAULT_RESOLVER_BASE}/api/v1/go-links`);
    if (!res.ok) return;

    const { go_links } = await res.json();
    const ranked = ([...(go_links || [])] as CachedGoLink[])
      .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
      .slice(0, TOP_LINK_LIMIT)
      .map((link) => ({
        keyword: link.keyword,
        target_url: link.target_url,
        description: link.description ?? null,
        click_count: link.click_count || 0,
      }));

    await chrome.storage.local.set({
      [GO_LINKS_CACHE_KEY]: ranked,
      [GO_LINKS_SYNCED_AT_KEY]: Date.now(),
    });
  } catch {
    // Keep the last good snapshot if the local web server is down
  }
}

async function readCachedGoLinks(): Promise<CachedGoLink[]> {
  const result = await chrome.storage.local.get(GO_LINKS_CACHE_KEY);
  const links = result[GO_LINKS_CACHE_KEY];
  return Array.isArray(links) ? (links as CachedGoLink[]) : [];
}

async function resolveFromCache(keyword: string): Promise<CachedGoLink | undefined> {
  const links = await readCachedGoLinks();
  return links.find((link) => link.keyword.toLowerCase() === keyword);
}

function toOmniboxSuggestions(links: CachedGoLink[], query: string) {
  return links
    .filter(
      (l) =>
        l.keyword.includes(query) ||
        (l.description && l.description.toLowerCase().includes(query))
    )
    .slice(0, 5)
    .map((l) => ({
      content: l.keyword,
      description: `<match>go/${l.keyword}</match> <dim>(${l.description || l.target_url})</dim>`,
    }));
}

function navigate(url: string, disposition: chrome.omnibox.OnInputEnteredDisposition) {
  switch (disposition) {
    case 'newForegroundTab':
      chrome.tabs.create({ url, active: true });
      break;
    case 'newBackgroundTab':
      chrome.tabs.create({ url, active: false });
      break;
    case 'currentTab':
    default:
      chrome.tabs.update({ url });
      break;
  }
}
