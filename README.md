# Aloalo — Mid Fin × MAOI

Launch microsite for the Mid Fin × MAOI Swim "Aloalo" edition. One page, static, Vite + TypeScript.
Production: https://aloalo.midfinco.com

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # checks copy, then builds to dist/
npm run preview    # serves dist/
```

`npm run og` rebuilds `public/og.png` and `public/favicon.svg` from the assets.

## Update the 75

`data/editions.json` is the single source of truth. Each entry has `no`, `size`, `status` and `label`. Change a `status` to one of `open`, `kept`, `allocated`, `kilo`, `sold`, set `label` to what the public should see on hover (or `null`), commit, and push. Vercel rebuilds the site. The live count, the grid, and the "shops holding numbers" list are all computed from this file; shops appear automatically from `allocated` entries, deduped by label, so give every fin a shop holds the same label, for example `"Allocated — Surf N Sea"`.

## Change the phase

The page reads Honolulu time and switches on its own: `pre` before November 28, `event` on the day, `post` after. To force a state, set `phaseOverride` in `site.config.json` to `"pre"`, `"event"` or `"post"` (back to `null` to let the date decide). In local dev you can also append `?phase=post` to the URL.

Post phase shows the product link only while `open` fins remain and `showPostPhaseBuyLink` is `true`. When none remain the page reads "All 75 have a home."

## Waitlist

Klaviyo's client subscription endpoint, public company ID only (the public key `XY75NE` and the list "Aloalo Waitlist (Mid Fin x MAOI)", both in `site.config.json` under `klaviyo`). Subscribers land on that list with the profile properties `source: aloalo-microsite` and `interest: maoi-aloalo`.

## Deploy

Hosted on Vercel from this repo. Every push to `main` deploys. DNS for `aloalo.midfinco.com` lives in GoDaddy: a CNAME record, host `aloalo`, pointing at `cname.vercel-dns.com`.

## Fonts

LT Motor Oil (display) is self-hosted under Lord Typo's license, which covers web use. Avenir Next LT Pro has a desktop-only Linotype license, so body text uses Figtree, a geometric humanist sans in the same spirit, self-hosted via Fontsource.
