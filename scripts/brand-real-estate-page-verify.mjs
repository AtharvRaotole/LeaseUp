/**
 * Shared real-estate page verification: HTTP fetch + title/h1 keyword check.
 */
export const RE_KEYWORDS = /(real\s*estate|site\s*selection|leasing|property)/i;

const BOT_HINTS =
  /captcha|access denied|access to this page has been denied|bot detection|please verify you are a human/i;

const SOFT_404_HINTS =
  /\b(not found|page not found|404|our apologies|error)\b/i;

export function pageSignalsPass(title, h1Text) {
  const blob = `${title || ''} ${h1Text || ''}`.trim();
  if (!blob) return false;
  if (SOFT_404_HINTS.test(blob) && !RE_KEYWORDS.test(blob)) return false;
  return RE_KEYWORDS.test(blob);
}

export function looksBotBlocked(status, htmlSnippet, title) {
  if (status === 403 || status === 429) return true;
  const blob = `${title || ''} ${htmlSnippet || ''}`;
  return BOT_HINTS.test(blob);
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function extractFirstH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  return m[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchRealEstatePage(url) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers,
      });
      const status = res.status;
      const finalUrl = res.url;
      if (status < 200 || status >= 400) {
        if (attempt < 2 && (status === 403 || status === 429)) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        return { status, finalUrl, title: '', h1: '', htmlSnippet: '', transient: false };
      }
      const html = await res.text();
      const title = extractTitle(html);
      const h1 = extractFirstH1(html);
      const htmlSnippet = html.slice(0, 4000);
      const bot = looksBotBlocked(status, htmlSnippet, title);
      const pass = !bot && pageSignalsPass(title, h1);
      return {
        status,
        finalUrl,
        title,
        h1,
        htmlSnippet,
        bot,
        pass,
        transient: false,
      };
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return {
        status: 0,
        finalUrl: url,
        title: '',
        h1: '',
        htmlSnippet: '',
        bot: false,
        pass: false,
        transient: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    status: 0,
    finalUrl: url,
    title: '',
    h1: '',
    htmlSnippet: '',
    bot: false,
    pass: false,
    transient: true,
  };
}
