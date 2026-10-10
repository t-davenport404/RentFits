import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LIMITS,
  DEMO_LISTINGS,
  filterListings,
  monthlyTotal,
  parseListingInput,
  RentalValidationError,
  type Listing,
  type ListingFilters,
} from "../lib/rentals.ts";

const filters: ListingFilters = {
  query: "",
  bedrooms: "all",
  city: "all",
  budgetMode: "base",
  maxRent: null,
  onlyAvailable: false,
  includeIncomeRestricted: true,
  savedOnly: false,
  savedIds: [],
  sort: "price",
};

function listing(overrides: Partial<Listing> = {}): Listing {
  return { ...DEMO_LISTINGS[0], ...overrides };
}

function validInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Example Courtyard",
    city: "College Park",
    address: "123 Example Road",
    bedrooms: 1,
    rent: 1000,
    ...overrides,
  };
}

function fieldError(input: unknown, expectedField: string) {
  assert.throws(
    () => parseListingInput(input),
    (error: unknown) => {
      assert.ok(error instanceof RentalValidationError);
      assert.ok(
        error.fieldErrors[expectedField],
        `Expected an error for ${expectedField}`,
      );
      return true;
    },
  );
}

test("default ceilings retain the requested bedroom amounts", () => {
  assert.deepEqual(DEFAULT_LIMITS, { 1: 1100, 2: 1400, 3: 1600 });
});

test("one- and two-bedroom default ceilings are inclusive", () => {
  const listings = [
    listing({ id: "one-match", bedrooms: 1, rent: 1100 }),
    listing({ id: "one-over", bedrooms: 1, rent: 1100.01 }),
    listing({ id: "two-match", bedrooms: 2, rent: 1400 }),
    listing({ id: "two-over", bedrooms: 2, rent: 1400.01 }),
  ];
  assert.deepEqual(
    filterListings(listings, filters).map((item) => item.id),
    ["one-match", "two-match"],
  );
});

test("three-bedroom default ceiling excludes exactly $1,600", () => {
  const listings = [
    listing({ id: "under", bedrooms: 3, rent: 1599.99 }),
    listing({ id: "boundary", bedrooms: 3, rent: 1600 }),
  ];
  assert.deepEqual(
    filterListings(listings, filters).map((item) => item.id),
    ["under"],
  );
});

test("an explicit custom ceiling is inclusive for every bedroom count", () => {
  const listings = [
    listing({ id: "match", bedrooms: 3, rent: 1600 }),
    listing({ id: "over", bedrooms: 3, rent: 1600.01 }),
  ];
  assert.deepEqual(
    filterListings(listings, { ...filters, maxRent: 1600 }).map(
      (item) => item.id,
    ),
    ["match"],
  );
});

test("monthly cost sums known fees, preserving unknown and zero values", () => {
  assert.equal(monthlyTotal({ rent: 799, monthlyFees: 65 }), 864);
  assert.equal(monthlyTotal({ rent: 1100, monthlyFees: 0 }), 1100);
  assert.equal(monthlyTotal({ rent: 1000, monthlyFees: null }), null);
  assert.equal(monthlyTotal({ rent: null, monthlyFees: 50 }), null);
});

test("monthly budgeting excludes unknown fees and includes fees in the threshold", () => {
  const listings = [
    listing({ id: "fits", rent: 1000, monthlyFees: 100 }),
    listing({ id: "over", rent: 1000, monthlyFees: 101 }),
    listing({ id: "unknown", rent: 799, monthlyFees: null }),
    listing({ id: "unpriced", rent: null, monthlyFees: 0 }),
  ];
  assert.deepEqual(
    filterListings(listings, { ...filters, budgetMode: "monthly" }).map(
      (item) => item.id,
    ),
    ["fits"],
  );
  assert.deepEqual(
    filterListings(listings, filters).map((item) => item.id),
    ["unknown", "fits", "over"],
  );
});

test("search combines case-insensitive words across name, city, and address", () => {
  const found = filterListings(DEMO_LISTINGS, {
    ...filters,
    query: "CEDAR college",
  });
  assert.deepEqual(
    found.map((item) => item.id),
    ["demo-cedar"],
  );
  assert.equal(
    filterListings(DEMO_LISTINGS, { ...filters, query: "cedar jackson" })
      .length,
    0,
  );
});

test("bedrooms and city narrow the matching records", () => {
  const found = filterListings(DEMO_LISTINGS, {
    ...filters,
    bedrooms: 2,
    city: " riverdale ",
  });
  assert.deepEqual(
    found.map((item) => item.id),
    ["demo-willow"],
  );
});

test("available-only excludes starting prices and unconfirmed inventory", () => {
  const listings = [
    listing({ id: "available", availability: "available" }),
    listing({ id: "starting", availability: "starting-price" }),
    listing({ id: "call", availability: "call" }),
    listing({ id: "unknown", availability: "unknown" }),
  ];
  assert.deepEqual(
    filterListings(listings, { ...filters, onlyAvailable: true }).map(
      (item) => item.id,
    ),
    ["available"],
  );
});

test("income restriction and saved-only filters work together", () => {
  const listings = [
    listing({ id: "saved" }),
    listing({ id: "restricted", incomeRestricted: true }),
    listing({ id: "other" }),
  ];
  const result = filterListings(listings, {
    ...filters,
    savedOnly: true,
    savedIds: ["saved", "restricted"],
    includeIncomeRestricted: false,
  });
  assert.deepEqual(
    result.map((item) => item.id),
    ["saved"],
  );
});

test("price sort uses selected budget mode without mutating input", () => {
  const listings = [
    listing({ id: "higher-base", rent: 900, monthlyFees: 0 }),
    listing({ id: "lower-base", rent: 800, monthlyFees: 150 }),
  ];
  assert.deepEqual(
    filterListings(listings, filters).map((item) => item.id),
    ["lower-base", "higher-base"],
  );
  assert.deepEqual(
    filterListings(listings, { ...filters, budgetMode: "monthly" }).map(
      (item) => item.id,
    ),
    ["higher-base", "lower-base"],
  );
  assert.deepEqual(
    listings.map((item) => item.id),
    ["higher-base", "lower-base"],
  );
});

test("newest sort puts valid checked dates before unknown dates", () => {
  const listings = [
    listing({ id: "unknown", checkedAt: null }),
    listing({ id: "older", checkedAt: "2026-09-01T12:00:00Z" }),
    listing({ id: "newer", checkedAt: "2026-10-01T12:00:00Z" }),
  ];
  assert.deepEqual(
    filterListings(listings, { ...filters, sort: "newest" }).map(
      (item) => item.id,
    ),
    ["newer", "older", "unknown"],
  );
});

test("invalid custom ceilings cannot accidentally disable budget filtering", () => {
  for (const maxRent of [-1, Infinity, NaN])
    assert.equal(
      filterListings(DEMO_LISTINGS, { ...filters, maxRent }).length,
      0,
    );
});

test("submissions normalize text, website URLs and safe defaults", () => {
  const parsed = parseListingInput(
    validInput({
      name: "  Example Courtyard  ",
      sourceUrl: "https://example.com",
      monthlyFees: 0,
    }),
  );
  assert.equal(parsed.name, "Example Courtyard");
  assert.equal(parsed.sourceUrl, "https://example.com/");
  assert.equal(parsed.monthlyFees, 0);
  assert.equal(parsed.moveInFees, null);
  assert.equal(parsed.latitude, null);
  assert.equal(parsed.longitude, null);
  assert.equal(parsed.availability, "unknown");
  assert.equal(parsed.evictionPolicy, "unknown");
});

test("explicitly unpriced leads are accepted while an omitted rent is rejected", () => {
  const unpriced = parseListingInput(validInput({ rent: null }));
  assert.equal(unpriced.rent, null);
  assert.equal(unpriced.availability, "call");
  const withoutRent = validInput();
  delete withoutRent.rent;
  fieldError(withoutRent, "rent");
});

test("submission validation rejects unsupported rooms and invalid prices", () => {
  for (const bedrooms of [0, 4, 1.5, "1", null])
    fieldError(validInput({ bedrooms }), "bedrooms");
  for (const rent of [-10, 0, Infinity, NaN, "999", 100001])
    fieldError(validInput({ rent }), "rent");
  fieldError(validInput({ monthlyFees: -1 }), "monthlyFees");
  fieldError(validInput({ rent: 999.999 }), "rent");
  fieldError(validInput({ moveInFees: "0" }), "moveInFees");
});

test("coordinates must be finite, in range, and supplied together", () => {
  fieldError(validInput({ latitude: 33.7 }), "location");
  fieldError(validInput({ latitude: 91, longitude: -84 }), "latitude");
  fieldError(validInput({ latitude: 33, longitude: Infinity }), "longitude");
  const parsed = parseListingInput(
    validInput({ latitude: 33.7, longitude: -84.4 }),
  );
  assert.equal(parsed.latitude, 33.7);
});

test("website validation requires HTTPS and rejects embedded credentials", () => {
  for (const sourceUrl of [
    "http://example.com",
    "javascript:alert(1)",
    "not a URL",
    "https://user:password@example.com",
    "https://localhost",
  ]) {
    fieldError(validInput({ sourceUrl }), "sourceUrl");
  }
});

test("submissions cannot manufacture checked dates or confirmed screening policies", () => {
  fieldError(validInput({ checkedAt: "2026-10-10T12:00:00Z" }), "checkedAt");
  fieldError(validInput({ isDemo: false }), "isDemo");
  fieldError(
    validInput({ evictionPolicy: "accepted", policyNotes: "Trust me" }),
    "evictionPolicy",
  );
  fieldError(validInput({ evictionPolicy: "case-by-case" }), "evictionPolicy");
});

test("malformed payloads and invalid field types receive field errors", () => {
  fieldError(null, "form");
  fieldError([], "form");
  fieldError(validInput({ name: "A" }), "name");
  fieldError(validInput({ incomeRestricted: "false" }), "incomeRestricted");
  fieldError(validInput({ incomeRestricted: null }), "incomeRestricted");
  fieldError(validInput({ availability: "guaranteed" }), "availability");
});

test("demo data never masquerades as verified rental inventory", () => {
  assert.ok(DEMO_LISTINGS.length >= 12);
  assert.equal(
    new Set(DEMO_LISTINGS.map((item) => item.id)).size,
    DEMO_LISTINGS.length,
  );
  for (const item of DEMO_LISTINGS) {
    assert.equal(item.isDemo, true);
    assert.equal(item.checkedAt, null);
    assert.equal(item.sourceUrl, null);
    assert.equal(item.evictionPolicy, "unknown");
  }
});
