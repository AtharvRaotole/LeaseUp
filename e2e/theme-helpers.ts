import type { Page } from '@playwright/test';

export const THEME_STORAGE_KEY = 'leaseup-theme';

export async function setAppTheme(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
    },
    { key: THEME_STORAGE_KEY, value: theme }
  );
}
