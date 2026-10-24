import type { Plugin } from 'vite';

const PRELOAD_FONT_HREFS = [
  '/fonts/source-sans-3/source-sans-3-latin-400-normal.woff2',
  '/fonts/source-sans-3/source-sans-3-latin-600-normal.woff2',
];

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
