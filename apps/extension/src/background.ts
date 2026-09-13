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
  default_url?: string | null;
  description?: string | null;
  click_count?: number;
}

function parseGoLinkInput(raw: string): { keyword: string; parameter: string | null } {
  const cleaned = raw
    .trim()
    .replace(/^go\//i, '')
    .replace(/^go\s+/i, '')
    .replace(/^\//, '');
  if (!cleaned) return { keyword: '', parameter: null };
  const match = cleaned.match(/^([^\s/]+)(?:[\s/]+(.+))?$/);
  const keyword = (match?.[1] || cleaned).toLowerCase();
  const parameter = match?.[2]?.trim() ? match[2].trim() : null;
  return { keyword, parameter };
}

function interpolateGoLinkUrl(
  link: Pick<CachedGoLink, 'target_url' | 'default_url'>,
  parameter: string | null
): string {
  const hasPlaceholder = link.target_url.includes('{}');

  let resolved: string;
  if (parameter && hasPlaceholder) {
    resolved = link.target_url.replace(/\{\}/g, encodeURIComponent(parameter));
  } else if (!parameter && hasPlaceholder) {
    if (link.default_url && link.default_url.trim().length > 0) {
      resolved = link.default_url.trim();
    } else {
      resolved = link.target_url.replace(/\/\{\}$|\{\}$/, '').replace(/\{\}/g, '');
    }
  } else if (!parameter) {
    if (link.default_url && link.default_url.trim().length > 0) {
      resolved = link.default_url.trim();
    } else {
      resolved = link.target_url;
    }
  } else {
    resolved = link.target_url;
  }

  // Safety guarantee: Never return a URL containing literal `{}` or `%7B%7D`
  return resolved
    .replace(/\/\{\}$|\{\}$/, '')
    .replace(/\{\}/g, '')
    .replace(/\/%7B%7D$|%7B%7D$/i, '')
    .replace(/%7B%7D/gi, '');
}


function goLinkParamPlaceholder(keyword: string): string {
  switch (keyword.toLowerCase()) {
    case 'jira':
      return '<issue-key>';
    case 'pr':
      return '<pull-id>';
    default:
      return '<param>';
  }
}

/** Preserve trailing arguments (e.g. `jira ENG-204`) without lowercasing the parameter. */
function omniboxQuery(text: string): string {
  return text.trim().replace(/^go\//i, '').replace(/^\//, '');
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
  const cleanKeyword = omniboxQuery(text);

  if (!cleanKeyword) {
    navigate(DEFAULT_RESOLVER_BASE, disposition);
    return;
  }

  const cachedUrl = await resolveFromCache(cleanKeyword);
  if (cachedUrl) {
    navigate(cachedUrl, disposition);
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
  const query = omniboxQuery(text);
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
        default_url: link.default_url ?? null,
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

async function resolveFromCache(raw: string): Promise<string | undefined> {
  const { keyword, parameter } = parseGoLinkInput(raw);
  const links = await readCachedGoLinks();
  const link = links.find((l) => l.keyword.toLowerCase() === keyword);
  if (!link) return undefined;
  return interpolateGoLinkUrl(link, parameter);
}

function toOmniboxSuggestions(links: CachedGoLink[], query: string) {
  const { keyword: baseKeyword, parameter } = parseGoLinkInput(query);
  const haystack = (baseKeyword || query).toLowerCase();

  return links
    .filter(
      (l) =>
        l.keyword.includes(haystack) ||
        (l.description && l.description.toLowerCase().includes(haystack))
    )
    .slice(0, 5)
    .map((l) => {
      const parameterized = l.target_url.includes('{}');
      const hint = goLinkParamPlaceholder(l.keyword);
      const interpolated =
        parameterized && parameter ? interpolateGoLinkUrl(l, parameter) : null;
      const syntax = parameterized ? `go ${l.keyword} ${hint}` : `go/${l.keyword}`;
      const dest = interpolated || l.description || l.default_url || l.target_url;
      return {
        content: parameter && parameterized ? `${l.keyword} ${parameter}` : l.keyword,
        description: `<match>${syntax}</match> <dim>(${dest})</dim>`,
      };
    });
}

async function navigate(url: string, disposition: chrome.omnibox.OnInputEnteredDisposition) {
  // Guard against bare URLs missing protocols
  let targetUrl = url;
  if (!/^https?:\/\//i.test(targetUrl) && !targetUrl.startsWith('chrome://')) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    switch (disposition) {
      case 'newForegroundTab':
        await chrome.tabs.create({ url: targetUrl, active: true });
        break;
      case 'newBackgroundTab':
        await chrome.tabs.create({ url: targetUrl, active: false });
        break;
      case 'currentTab':
      default: {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          await chrome.tabs.update(activeTab.id, { url: targetUrl });
        } else {
          // Fallback if no active tab ID is found
          await chrome.tabs.create({ url: targetUrl, active: true });
        }
        break;
      }
    }
  } catch (err) {
    console.error('[Stager] Navigation error:', err);
    await chrome.tabs.create({ url: targetUrl, active: true });
  }
}

