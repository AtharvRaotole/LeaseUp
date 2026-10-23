import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { SHARE_FONT_400, SHARE_FONT_600 } from './share-font-data';

const FONT_FAMILY = 'Schibsted Grotesk';

let wasmReady: Promise<void> | undefined;

async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(wasm);
  }
  await wasmReady;
}

const resvgFontOptions = {
  font: {
    loadSystemFonts: false,
    fontBuffers: [SHARE_FONT_400, SHARE_FONT_600],
    defaultFontFamily: FONT_FAMILY,
    sansSerifFamily: FONT_FAMILY,
    serifFamily: FONT_FAMILY,
  },
};

export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const resvg = new Resvg(svg, {
    ...resvgFontOptions,
    fitTo: { mode: 'width', value: 1200 },
    background: '#FAFAF7',
  });
  return resvg.render().asPng();
}
