import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/analyze-robustness');
const AMBIGUOUS = '1574 N Milwaukee Ave, Chicago';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': BASE,
    'Access-Control-Allow-Credentials': 'true',
  };
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function shot(name) {
  await page.screenshot({ path: join(OUT, name), fullPage: false });
}

async function mockGeocode(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders(),
    body: JSON.stringify(body),
  });
}

async function openRun(address) {
  await page.goto(`${BASE}/r/run?address=${encodeURIComponent(address)}&radius=10`);
}

// Ambiguous (picker state)
await openRun(AMBIGUOUS);
await page.getByTestId('geocode-confirm').waitFor({ timeout: 30_000 });
await shot('ambiguous-1440.png');
await page.setViewportSize({ width: 390, height: 844 });
await shot('ambiguous-390.png');
await page.setViewportSize({ width: 1440, height: 900 });

const cases = [
  {
    slug: 'po-box',
    address: 'PO Box 99, Austin, TX 78701',
    geocode: {
      code: 'GEOCODE_PO_BOX',
      error:
        'We need a street address for a retail storefront. PO boxes cannot be mapped to a pin.',
    },
    status: 400,
  },
  {
    slug: 'non-us',
    address: '10 Downing St, London, England',
    geocode: {
      code: 'GEOCODE_NON_US',
      error: 'LeaseUp supports US storefront addresses only.',
    },
    status: 400,
  },
  {
    slug: 'gibberish',
    address: 'xkjq mxzq qwerty',
    geocode: {
      code: 'GEOCODE_UNRECOGNIZED',
      error: 'That does not look like a US storefront address.',
    },
    status: 400,
  },
  {
    slug: 'geocode-timeout',
    address: '500 W 2nd St, Austin, TX 78701',
    geocode: {
      code: 'GEOCODE_TIMEOUT',
      error: 'Address lookup timed out. Check the spelling and try again in a moment.',
    },
    status: 503,
  },
];

for (const c of cases) {
  await page.unroute('**/api/geocode').catch(() => undefined);
  await page.route('**/api/geocode', async (route) => {
    await mockGeocode(route, { ...c.geocode, error: c.geocode.error }, c.status);
  });
  await openRun(c.address);
  await page.getByTestId('report-error').waitFor({ timeout: 20_000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(`${c.slug}-1440.png`);
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(`${c.slug}-390.png`);
}

// Rural empty report
const ruralLocation = {
  address: '1 Main St, Chicken, AK 99732',
  latitude: 64.073,
  longitude: -141.936,
  neighborhood: 'Chicken',
  city: 'Chicken',
  resolvedAddress: '1 Main St, Chicken, AK 99732',
};
const ruralBody = {
  location: ruralLocation,
  backtest: {
    totalStores: 0,
    predictedStores: 0,
    accuracy: 0,
    precisionAt10: 0,
    presentInTop10: 0,
    auc: 0,
    examples: [],
  },
  prospects: [],
  dataQuality: 'insufficient',
  warnings: ['No taste-ranked brands for this pin yet'],
  runId: 'screenshot-rural',
  timestamp: new Date().toISOString(),
  mode: 'live',
};

await page.unroute('**/api/geocode').catch(() => undefined);
await page.unroute('**/api/analyze/stream').catch(() => undefined);
await page.route('**/api/geocode', async (route) => {
  await mockGeocode(route, {
    needsConfirmation: false,
    candidates: [],
    location: ruralLocation,
  });
});
await page.route('**/api/analyze/stream', async (route) => {
  const sse = `event: complete\ndata: ${JSON.stringify(ruralBody)}\n\n`;
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'text/event-stream; charset=utf-8' },
    body: sse,
  });
});
await page.goto(
  `${BASE}/r/run?address=${encodeURIComponent(ruralLocation.address)}&radius=25`
);
await page.getByTestId('report-short-list-notice').waitFor({ timeout: 25_000 });
await page.setViewportSize({ width: 1440, height: 900 });
await shot('rural-empty-1440.png');
await page.setViewportSize({ width: 390, height: 844 });
await shot('rural-empty-390.png');

// Qloo timeout
await page.unroute('**/api/analyze/stream').catch(() => undefined);
await page.route('**/api/geocode', async (route) => {
  await mockGeocode(route, {
    needsConfirmation: false,
    candidates: [],
    location: {
      address: '500 W 2nd St, Austin, TX 78701',
      latitude: 30.27,
      longitude: -97.74,
      city: 'Austin',
      resolvedAddress: '500 W 2nd St, Austin, TX 78701',
    },
  });
});
await page.route('**/api/analyze/stream', async (route) => {
  const sse = `event: error\ndata: ${JSON.stringify({
    message: 'Taste data is slow right now. Try again in a moment.',
    code: 'QLOO_UNAVAILABLE',
    retryAfterSec: 30,
  })}\n\n`;
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'text/event-stream; charset=utf-8' },
    body: sse,
  });
});
await openRun('500 W 2nd St, Austin, TX 78701');
await page.getByTestId('report-error').waitFor({ timeout: 25_000 });
await page.setViewportSize({ width: 1440, height: 900 });
await shot('qloo-timeout-1440.png');
await page.setViewportSize({ width: 390, height: 844 });
await shot('qloo-timeout-390.png');

await browser.close();
console.log('saved screenshots to', OUT);
