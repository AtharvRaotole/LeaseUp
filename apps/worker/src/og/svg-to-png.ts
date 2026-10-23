import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';

let wasmReady: Promise<void> | undefined;

async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(wasm);
  }
  await wasmReady;
}

export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    background: '#FAFAF7',
  });
  return resvg.render().asPng();
}
