const WORKER_ORIGIN = 'https://leaseup-worker.issue-atharva.workers.dev';

type ShareMeta = {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
};

function isBot(userAgent: string): boolean {
  return /(facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|googlebot|bingpreview|embedly)/i.test(
    userAgent
  );
}

function injectShareMeta(html: string, meta: ShareMeta): string {
  const block = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}" />
  `;
  return html.replace(/<title>[^<]*<\/title>/i, block);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const url = new URL(context.request.url);
  const { pathname } = url;
  const pitchMatch = pathname.match(/^\/p(?:itch)?\/([^/]+)$/);
  const reportMatch = pathname.match(/^\/r\/([^/]+)$/);
  if (!pitchMatch && !reportMatch) {
    return context.next();
  }

  const ua = context.request.headers.get('User-Agent') ?? '';
  if (!isBot(ua)) {
    return context.next();
  }

  const sharePath = pitchMatch
    ? `/api/share/pitch/${pitchMatch[1]}`
    : `/api/share/report?${url.searchParams.toString()}&slug=${encodeURIComponent(reportMatch![1])}`;

  try {
    const metaRes = await fetch(`${WORKER_ORIGIN}${sharePath}`);
    if (!metaRes.ok) return context.next();
    const meta = (await metaRes.json()) as ShareMeta;
    const pageRes = await context.next();
    const contentType = pageRes.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return pageRes;
    const html = await pageRes.text();
    if (!html.includes('<!DOCTYPE html>')) return pageRes;
    const headers = new Headers(pageRes.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(injectShareMeta(html, meta), { status: pageRes.status, headers });
  } catch {
    return context.next();
  }
}
