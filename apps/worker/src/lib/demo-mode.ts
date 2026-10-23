import { ConfigurationError } from './errors';

export const DEMO_MODE_REQUIRED_MESSAGE =
  'This address is only available in live mode. Set APP_MODE=live with QLOO_API_KEY, or use one of the three demo chip addresses.';

export class DemoModeRequiredError extends ConfigurationError {
  constructor() {
    super(DEMO_MODE_REQUIRED_MESSAGE);
  }
}
