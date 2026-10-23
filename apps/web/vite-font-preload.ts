import type { Plugin } from 'vite';

const PRELOAD_FONT_IDS = ['geist-latin-400-normal', 'geist-latin-600-normal'];

/** Inject hashed woff2 preloads after the production bundle is known. */
export function fontPreloadPlugin(): Plugin {
  return {
    name: 'leaseup-font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const tags = PRELOAD_FONT_IDS.flatMap((id) => {
          const file = Object.keys(ctx.bundle).find(
            (name) => name.endsWith('.woff2') && name.includes(id)
          );
          if (!file) return [];
          return [
            {
              tag: 'link',
              injectTo: 'head-prepend',
              attrs: {
                rel: 'preload',
                href: `/${file}`,
                as: 'font',
                type: 'font/woff2',
                crossorigin: '',
              },
            },
          ];
        });
        return tags.length ? { html, tags } : html;
      },
    },
  };
}
