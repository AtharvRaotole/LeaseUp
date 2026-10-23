/**
 * Measure demo analyze stream duration (requires worker on :8787, APP_MODE=demo).
 */

const WORKER = process.env.WORKER_URL || 'http://localhost:8787';

const body = {
  address: '1574 N Milwaukee Ave, Chicago, IL 60622',
  radius: 10,
};

const started = performance.now();
const res = await fetch(`${WORKER}/api/analyze/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

if (!res.ok || !res.body) {
  console.error('Stream failed', res.status);
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let completed = false;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  if (buffer.includes('event: complete')) completed = true;
}

const ms = Math.round(performance.now() - started);
console.log(JSON.stringify({ demoWickerStreamMs: ms, completed }, null, 2));
