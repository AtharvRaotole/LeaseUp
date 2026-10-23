/** SHA-256 hex prefix for KV keys (Cloudflare KV max key length 512 bytes). */
export async function sha256Short(input: string, length = 32): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}
