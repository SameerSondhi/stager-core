export {};

const WEB_URL = 'http://localhost:3000';

async function init() {
  // Check if web app is responding
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${WEB_URL}/api/v1/resolve?keyword=ping`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // If server responded (even 404 for 'ping' means the server is online!)
    if (res.status === 404 || res.status === 200) {
      window.location.href = WEB_URL;
      return;
    }
  } catch {
    // Server is not running yet; display the fallback UI
  }

  const form = document.getElementById('goForm') as HTMLFormElement;
  const input = document.getElementById('keywordInput') as HTMLInputElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = input.value.trim().replace(/^go\//, '');
    if (!val) return;

    try {
      const res = await fetch(`${WEB_URL}/api/v1/resolve?keyword=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.target_url) {
          window.location.href = data.target_url;
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }

    window.location.href = `${WEB_URL}/?search=${encodeURIComponent(val)}`;
  });
}

init();
