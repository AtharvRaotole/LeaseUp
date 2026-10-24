import type { Plugin } from 'vite';

/** Critical text weights (latin) — preloaded from /public/fonts. */
const PRELOAD_FONT_HREFS = ['/fonts/schibsted-grotesk/schibsted-grotesk-latin-600-normal.woff2'];

/** Inject font preloads for LCP headline and UI semibold. */
export function fontPreloadPlugin(): Plugin {
  return {
    name: 'leaseup-font-preload',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const tags = PRELOAD_FONT_HREFS.map((href) => ({
          tag: 'link',
          injectTo: 'head-prepend',
          attrs: {
            rel: 'preload',
            href,
            as: 'font',
            type: 'font/woff2',
            crossorigin: '',
          },
        }));
        return { html, tags };
      },
    },
  };
}
