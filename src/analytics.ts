import { inject, track as vercelTrack } from '@vercel/analytics';

let ready = false;

export function initAnalytics(): void {
  if (!import.meta.env.PROD) return;
  try {
    inject({ mode: 'production' });
    ready = true;
  } catch {
    ready = false;
  }
}

export type EventName = 'waitlist_success' | 'b2b_click' | 'product_click';

export function track(name: EventName, data?: Record<string, string | number | boolean>): void {
  if (!ready) return;
  try {
    vercelTrack(name, data);
  } catch {
    /* analytics must never break the page */
  }
}
