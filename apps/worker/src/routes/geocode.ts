import { Hono } from 'hono';
import type { Env } from '../index';
import { GeocodePreviewRequestSchema } from '@leaseup/contracts';
import { GeocodeService } from '../services/geocode';
import { getResponseCache } from '../lib/worker-cache';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

export const geocodeRouter = new Hono<{ Bindings: Env }>();

geocodeRouter.post('/geocode', async (c) => {
  const body = GeocodePreviewRequestSchema.parse(await c.req.json());
  const mode = c.env.APP_MODE === 'live' ? 'live' : 'demo';
  const service = new GeocodeService(
    getResponseCache(),
    c.env.NOMINATIM_CONTACT || DEFAULT_NOMINATIM_CONTACT,
    mode
  );
  const preview = await service.preview(body.address);
  return c.json(preview);
});
