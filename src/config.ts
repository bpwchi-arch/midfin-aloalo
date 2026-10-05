import raw from '../site.config.json';

export type Phase = 'pre' | 'event' | 'post';

export const config = raw as {
  phaseOverride: Phase | null;
  eventDateHST: string;
  timezone: string;
  productUrl: string;
  b2bApplicationUrl: string;
  b2bLoginUrl: string;
  klaviyo: { companyId: string; listId: string };
  showPostPhaseBuyLink: boolean;
  links: { midfin: string; maoi: string; maoiHandle: string };
};

/** Today's calendar date in Honolulu, as YYYY-MM-DD. */
export function honoluluToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function computePhase(): Phase {
  if (import.meta.env.DEV) {
    const p = new URLSearchParams(location.search).get('phase');
    if (p === 'pre' || p === 'event' || p === 'post') return p;
  }
  if (config.phaseOverride) return config.phaseOverride;
  const today = honoluluToday();
  if (today < config.eventDateHST) return 'pre';
  if (today === config.eventDateHST) return 'event';
  return 'post';
}

const PLACEHOLDER = 'AUSTIN_TO_SUPPLY';

export const klaviyoConfigured =
  config.klaviyo.companyId !== PLACEHOLDER &&
  config.klaviyo.listId !== PLACEHOLDER &&
  config.klaviyo.companyId.length > 0 &&
  config.klaviyo.listId.length > 0;
