# RentFits

**A home that fits your budget.**

RentFits is an Atlanta-first rental discovery project for people who check many websites to find an affordable home. This first version makes search and comparison usable before introducing automated collection.

## Working features

- Search by bedrooms, city, keywords, availability, income restrictions, and price.
- Default base-rent ceilings: one bedroom ≤ $1,100; two bedrooms ≤ $1,400; three bedrooms < $1,600. A custom ceiling is inclusive.
- Compare base rent with rent plus known mandatory monthly fees. Unknown fees remain unknown and cannot qualify a rental for a confirmed monthly-cost match.
- Rental details, source links, move-in fees, policy notes, and a geographic overview.
- Save favorites on this device when signed out, or to your account when signed in.
- Add private rental leads from property websites or classifieds. Server validation rejects invalid inputs and duplicates per user.
- Calculate remaining monthly income from entered expenses. This is arithmetic, not an estimate of landlord approval.

All demo records are fictional. Their illustrations, locations, availability, and prices are not real rental offers. Submitted leads are private and not independently verified. Missing information remains visible as leads to check.

## Local development

Requires Node.js 22.13 or newer. The lockfile pins dependencies.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_supreme_swordsman.sql
npm run dev
```

Open the printed local URL. Local development sign-in uses the starter's mock account; production sign-in is provided by Sites. Local and production databases are separate. Apply each generated migration once and in order; do not modify applied SQL.

```sh
npm test
npm run typecheck
```

On Windows, if the npm launcher fails, invoke the installed npm CLI through Node.js. Keep local environment workarounds in ignored .sites-runtime/, never in production code.

## Implementation

React and TypeScript handle the interface. Vinext provides server routes; Cloudflare D1 and Drizzle store private leads and favorites. The Sites starter manages production authentication and deployment.

- app/rentfits-app.tsx: interface.
- lib/rentals.ts: typed records, fictional fixtures, exact price rules, validation.
- app/api/listings/route.ts: owner-authorized private leads.
- app/api/saved/route.ts: authenticated favorites.
- db/schema.ts and drizzle/: schema and generated migration.
- tests/: boundaries, missing data, input validation, origin and request-size checks.

Ownership comes from authenticated identity. All private reads and deletes filter by that identity; client-supplied verification fields are rejected. Private responses are not publicly cached. External source URLs are displayed as links; the server does not fetch arbitrary submitted URLs.

## Next milestone

Validate the manual workflow with a small Atlanta-area pilot: collect permission-compatible sources, confirm real prices and fees, and measure useful properties other searches missed. Add editorial verification and corrections before publishing a public directory.

Automated geographic discovery, scheduled price refreshes, AI extraction, a public community directory, and independently confirmed eviction policies are not connected in this version. The status endpoint explicitly reports manual mode. Future collectors should preserve source evidence, unit and lease terms, and dates; respect provider access and retention requirements; and protect against arbitrary URL fetching.

A map result identifies a property, not an available unit. RentFits cannot promise complete rental coverage; its aim is more useful options with clear costs and evidence.
