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

export class GeocodeNotFoundError extends Error {
  readonly code = 'GEOCODE_NOT_FOUND';

  constructor(message = 'We could not find that street address. Use a retail storefront with city and state.') {
    super(message);
    this.name = 'GeocodeNotFoundError';
  }
}

export class GeocodeInputError extends Error {
  readonly code: 'GEOCODE_PO_BOX' | 'GEOCODE_NON_US' | 'GEOCODE_UNRECOGNIZED';

  constructor(code: GeocodeInputError['code'], message: string) {
    super(message);
    this.name = 'GeocodeInputError';
    this.code = code;
  }
}
