// Every string the page can insert at runtime lives here so scripts/check-copy.mjs can read it.
export const COPY = {
  countOpen: (n: number) => `${n} of 75 remain.`,
  countNone: 'None remain.',
  eventBanner: 'Today at Kilo Summit, Kaimukī.',
  postRemain: 'The rest are here.',
  postNone: 'All 75 have a home.',
  stepOnlineNow: 'Online, now.',
  waitlistSuccess: "You're on the list. We'll write once.",
  waitlistInvalid: "That email doesn't look right. Check it and try again.",
  waitlistNetwork: "Couldn't reach the list. Try again in a minute.",
  waitlistPending: 'One moment.',
  sizeLabel: { '10in': '10 inch', '10.5in': '10.5 inch' } as Record<string, string>,
  statusLabel: {
    open: 'Open',
    kept: 'Kept',
    allocated: 'With a shop',
    kilo: 'At Kilo Summit',
    sold: 'Home',
  } as Record<string, string>,
  devMock: 'Dev only: Klaviyo IDs are placeholders, so the waitlist is running against a mock. Real submits will not reach a list until site.config.json has the company ID and list ID.',
};
