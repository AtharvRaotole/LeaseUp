import type { GeocodeCandidate } from '@leaseup/contracts';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class UpstreamError extends Error {
  statusCode: number;
  code?: string;
  /** Broker-safe copy for API responses (never raw upstream text). */
  userMessage?: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'UpstreamError';
    this.statusCode = statusCode;
  }
}

export class GeocodeAmbiguousError extends Error {
  readonly code = 'GEOCODE_AMBIGUOUS';
  readonly candidates: GeocodeCandidate[];

  constructor(candidates: GeocodeCandidate[]) {
    super('Multiple possible locations for this address. Please confirm on the map.');
    this.name = 'GeocodeAmbiguousError';
    this.candidates = candidates;
  }
}
