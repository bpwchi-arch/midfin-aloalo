import { config, klaviyoConfigured } from './config';
import { COPY } from './copy';
import { track } from './analytics';

const KLAVIYO_REVISION = '2026-07-15';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function subscribe(email: string): Promise<void> {
  if (!klaviyoConfigured) {
    if (import.meta.env.DEV) {
      // Mock: behaves like the real endpoint. "fail@..." simulates a network failure.
      await new Promise((r) => setTimeout(r, 700));
      if (email.startsWith('fail@')) throw new Error('mock network failure');
      return;
    }
    throw new Error('Klaviyo is not configured');
  }
  const url = `https://a.klaviyo.com/client/subscriptions?company_id=${encodeURIComponent(config.klaviyo.companyId)}`;
  const body = {
    data: {
      type: 'subscription',
      attributes: {
        custom_source: 'aloalo-microsite',
        profile: {
          data: {
            type: 'profile',
            attributes: {
              email,
              properties: { source: 'aloalo-microsite', interest: 'maoi-aloalo' },
              subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
            },
          },
        },
      },
      relationships: { list: { data: { type: 'list', id: config.klaviyo.listId } } },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.api+json', revision: KLAVIYO_REVISION },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Klaviyo responded ${res.status}`);
}

export function initWaitlist(): void {
  const form = document.getElementById('waitlist-form') as HTMLFormElement;
  const input = document.getElementById('email') as HTMLInputElement;
  const btn = document.getElementById('waitlist-btn') as HTMLButtonElement;
  const status = document.getElementById('waitlist-status') as HTMLElement;
  let pending = false;

  const say = (msg: string, error = false) => {
    status.textContent = msg;
    status.classList.toggle('is-error', error);
  };

  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    if (status.classList.contains('is-error')) say('');
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (pending) return;
    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      input.setAttribute('aria-invalid', 'true');
      say(COPY.waitlistInvalid, true);
      input.focus();
      return;
    }
    pending = true;
    btn.disabled = true;
    say(COPY.waitlistPending);
    try {
      await subscribe(email);
      say(COPY.waitlistSuccess);
      form.reset();
      track('waitlist_success');
    } catch {
      say(COPY.waitlistNetwork, true);
    } finally {
      pending = false;
      btn.disabled = false;
    }
  });

  if (!klaviyoConfigured && import.meta.env.DEV) {
    const note = document.getElementById('dev-note') as HTMLElement;
    note.textContent = COPY.devMock;
    note.hidden = false;
  }
}
