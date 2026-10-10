/** Prices in this module are monthly USD amounts. Demo records are fictional. */
export type BedroomCount = 1 | 2 | 3;
export type Availability = "available" | "starting-price" | "call" | "unknown";
export type EvictionPolicy = "unknown" | "case-by-case" | "accepted";

export interface Listing {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: BedroomCount;
  rent: number | null;
  monthlyFees: number | null;
  moveInFees: number | null;
  availability: Availability;
  sourceUrl: string | null;
  sourceLabel: string;
  checkedAt: string | null;
  incomeRestricted: boolean;
  evictionPolicy: EvictionPolicy;
  policyNotes: string | null;
  image: string;
  isDemo: boolean;
}

export const DEFAULT_LIMITS: Readonly<Record<BedroomCount, number>> = {
  1: 1100,
  2: 1400,
  3: 1600,
};

export const CITIES = [
  "Atlanta",
  "College Park",
  "Riverdale",
  "Jonesboro",
  "Griffin",
  "Jackson",
] as const;

export interface ListingFilters {
  query: string;
  bedrooms: number | "all";
  city: string;
  budgetMode: "base" | "monthly";
  maxRent: number | null;
  onlyAvailable: boolean;
  includeIncomeRestricted: boolean;
  savedOnly: boolean;
  savedIds: string[];
  sort: "price" | "newest" | "city";
}

export type RentalFilters = ListingFilters;

/** Unknown fees remain unknown; they are never interpreted as $0. */
export function monthlyTotal(
  listing: Pick<Listing, "rent" | "monthlyFees">,
): number | null {
  if (listing.rent === null || listing.monthlyFees === null) return null;
  return listing.rent + listing.monthlyFees;
}

function searchable(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Default three-bedroom ceiling is strict. A user-entered ceiling is inclusive. */
export function filterListings(
  listings: readonly Listing[],
  filters: ListingFilters,
): Listing[] {
  const words = searchable(filters.query).split(/\s+/).filter(Boolean);
  const requestedCity = searchable(filters.city);
  const saved = new Set(filters.savedIds);
  const price = (listing: Listing) =>
    filters.budgetMode === "monthly" ? monthlyTotal(listing) : listing.rent;
  const results = listings.filter((listing) => {
    if (filters.bedrooms !== "all" && listing.bedrooms !== filters.bedrooms)
      return false;
    if (
      requestedCity &&
      requestedCity !== "all" &&
      searchable(listing.city) !== requestedCity
    )
      return false;
    if (filters.onlyAvailable && listing.availability !== "available")
      return false;
    if (!filters.includeIncomeRestricted && listing.incomeRestricted)
      return false;
    if (filters.savedOnly && !saved.has(listing.id)) return false;
    const haystack = searchable(
      `${listing.name} ${listing.city} ${listing.address}`,
    );
    if (!words.every((word) => haystack.includes(word))) return false;
    const amount = price(listing);
    if (amount === null || !Number.isFinite(amount) || amount < 0) return false;
    if (filters.maxRent !== null) {
      return (
        Number.isFinite(filters.maxRent) &&
        filters.maxRent >= 0 &&
        amount <= filters.maxRent
      );
    }
    const ceiling = DEFAULT_LIMITS[listing.bedrooms];
    return listing.bedrooms === 3 ? amount < ceiling : amount <= ceiling;
  });
  return results.sort((left, right) => {
    if (filters.sort === "newest") {
      const timestamp = (value: string | null) => {
        const parsed = value === null ? NaN : Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      return (
        timestamp(right.checkedAt) - timestamp(left.checkedAt) ||
        left.name.localeCompare(right.name)
      );
    }
    if (filters.sort === "city")
      return (
        left.city.localeCompare(right.city) ||
        left.name.localeCompare(right.name)
      );
    return (
      (price(left) ?? Infinity) - (price(right) ?? Infinity) ||
      left.name.localeCompare(right.name)
    );
  });
}

/** Submissions are leads awaiting review, rather than verified public listings. */
export interface ListingInput {
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: BedroomCount;
  rent: number | null;
  monthlyFees: number | null;
  moveInFees: number | null;
  availability: Availability;
  sourceUrl: string | null;
  incomeRestricted: boolean;
  evictionPolicy: "unknown";
  policyNotes: string | null;
}

export class RentalValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super("Please check the highlighted listing details.");
    this.name = "RentalValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export function parseListingInput(value: unknown): ListingInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RentalValidationError({ form: "Enter a listing as an object." });
  }
  const data = value as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const allowed = new Set([
    "name",
    "city",
    "address",
    "latitude",
    "longitude",
    "bedrooms",
    "rent",
    "monthlyFees",
    "moveInFees",
    "availability",
    "sourceUrl",
    "incomeRestricted",
    "evictionPolicy",
    "policyNotes",
  ]);
  for (const key of Object.keys(data)) {
    if (!allowed.has(key))
      errors[key] = "This field is not accepted in a listing submission.";
  }
  const text = (
    key: string,
    minimum: number,
    maximum: number,
    optional = false,
  ): string | null => {
    const raw = data[key];
    if (optional && (raw === undefined || raw === null || raw === ""))
      return null;
    if (typeof raw !== "string") {
      errors[key] = "Enter text for this field.";
      return null;
    }
    const result = raw.trim();
    if (optional && result.length === 0) return null;
    if (
      result.length < minimum ||
      result.length > maximum ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)
    ) {
      errors[key] = `Use between ${minimum} and ${maximum} characters.`;
      return null;
    }
    return result;
  };
  const number = (
    key: string,
    minimum: number,
    maximum: number,
    optional = false,
  ): number | null => {
    const raw = data[key];
    if (optional && (raw === undefined || raw === null)) return null;
    if (
      typeof raw !== "number" ||
      !Number.isFinite(raw) ||
      raw < minimum ||
      raw > maximum
    ) {
      errors[key] = `Enter a number between ${minimum} and ${maximum}.`;
      return null;
    }
    return raw;
  };
  const money = (
    key: string,
    minimum: number,
    optional = false,
  ): number | null => {
    const result = number(key, minimum, 100000, optional);
    if (
      result !== null &&
      Math.abs(result * 100 - Math.round(result * 100)) > 0.000001
    ) {
      errors[key] = "Use no more than two decimal places.";
    }
    return result;
  };
  const name = text("name", 2, 120);
  const city = text("city", 2, 80);
  const address = text("address", 5, 240);
  const rent = data.rent === null ? null : money("rent", 1);
  const monthlyFees = money("monthlyFees", 0, true);
  const moveInFees = money("moveInFees", 0, true);
  const latitude = number("latitude", -90, 90, true);
  const longitude = number("longitude", -180, 180, true);
  if ((latitude === null) !== (longitude === null))
    errors.location =
      "Supply both latitude and longitude, or leave both blank.";
  const bedrooms = data.bedrooms;
  if (bedrooms !== 1 && bedrooms !== 2 && bedrooms !== 3)
    errors.bedrooms = "Select one, two, or three bedrooms.";
  const availability =
    data.availability === undefined
      ? rent === null
        ? "call"
        : "unknown"
      : data.availability;
  if (
    !["available", "starting-price", "call", "unknown"].includes(
      availability as string,
    )
  ) {
    errors.availability = "Select a valid availability status.";
  }
  const incomeRestricted =
    data.incomeRestricted === undefined ? false : data.incomeRestricted;
  if (typeof incomeRestricted !== "boolean")
    errors.incomeRestricted = "Use true or false.";
  const policyNotes = text("policyNotes", 1, 1000, true);
  if (data.evictionPolicy !== undefined && data.evictionPolicy !== "unknown") {
    errors.evictionPolicy =
      "Rental screening policies must be independently confirmed before publication.";
  }
  const source = text("sourceUrl", 1, 2048, true);
  let sourceUrl: string | null = null;
  if (source !== null) {
    try {
      const url = new URL(source);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        !url.hostname.includes(".")
      ) {
        errors.sourceUrl =
          "Use a public HTTPS website address without login credentials.";
      } else {
        sourceUrl = url.href;
      }
    } catch {
      errors.sourceUrl = "Use a valid HTTPS website address.";
    }
  }
  if (Object.keys(errors).length) throw new RentalValidationError(errors);
  return {
    name: name!,
    city: city!,
    address: address!,
    latitude,
    longitude,
    bedrooms: bedrooms as BedroomCount,
    rent,
    monthlyFees,
    moveInFees,
    availability: availability as Availability,
    sourceUrl,
    incomeRestricted: incomeRestricted as boolean,
    evictionPolicy: "unknown",
    policyNotes,
  };
}

const DEMO_BASE = {
  sourceUrl: null,
  sourceLabel: "Fictional demo listing",
  checkedAt: null,
  incomeRestricted: false,
  evictionPolicy: "unknown" as const,
  policyNotes: null,
  isDemo: true,
};

/** Illustrative locations and prices only. None represent a real rental offer. */
export const DEMO_LISTINGS: Listing[] = [
  {
    ...DEMO_BASE,
    id: "demo-cedar",
    name: "Cedar Terrace",
    city: "College Park",
    address: "Illustrative location near Old National Highway",
    latitude: 33.609,
    longitude: -84.474,
    bedrooms: 1,
    rent: 799,
    monthlyFees: 65,
    moveInFees: 300,
    availability: "available",
    image: "/illustrations/courtyard.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-peachtree",
    name: "Peachtree Nook",
    city: "Atlanta",
    address: "Illustrative location in southwest Atlanta",
    latitude: 33.721,
    longitude: -84.444,
    bedrooms: 1,
    rent: 1040,
    monthlyFees: 50,
    moveInFees: 500,
    availability: "available",
    image: "/illustrations/brick.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-clayton",
    name: "Clayton Court",
    city: "Riverdale",
    address: "Illustrative location near Church Street",
    latitude: 33.573,
    longitude: -84.414,
    bedrooms: 1,
    rent: 1100,
    monthlyFees: 0,
    moveInFees: 450,
    availability: "available",
    image: "/illustrations/garden.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-southline",
    name: "Southline Flats",
    city: "Jonesboro",
    address: "Illustrative location near Main Street",
    latitude: 33.528,
    longitude: -84.352,
    bedrooms: 1,
    rent: 1070,
    monthlyFees: null,
    moveInFees: null,
    availability: "starting-price",
    image: "/illustrations/brick.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-pine",
    name: "Pine Hollow",
    city: "Griffin",
    address: "Illustrative location near North Hill Street",
    latitude: 33.257,
    longitude: -84.272,
    bedrooms: 1,
    rent: 925,
    monthlyFees: 35,
    moveInFees: 300,
    availability: "available",
    image: "/illustrations/cottage.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-willow",
    name: "Willow Creek",
    city: "Riverdale",
    address: "Illustrative location near Georgia Highway 85",
    latitude: 33.558,
    longitude: -84.409,
    bedrooms: 2,
    rent: 1275,
    monthlyFees: 60,
    moveInFees: 600,
    availability: "available",
    image: "/illustrations/courtyard.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-junction",
    name: "Junction Homes",
    city: "Jackson",
    address: "Illustrative location near Third Street",
    latitude: 33.295,
    longitude: -83.966,
    bedrooms: 2,
    rent: 1400,
    monthlyFees: 0,
    moveInFees: 700,
    availability: "available",
    image: "/illustrations/townhomes.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-oakwell",
    name: "Oakwell Gardens",
    city: "College Park",
    address: "Illustrative location near Riverdale Road",
    latitude: 33.592,
    longitude: -84.455,
    bedrooms: 2,
    rent: 1340,
    monthlyFees: 95,
    moveInFees: 450,
    availability: "available",
    image: "/illustrations/garden.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-springline",
    name: "Springline Place",
    city: "Jonesboro",
    address: "Illustrative location near Tara Boulevard",
    latitude: 33.502,
    longitude: -84.35,
    bedrooms: 2,
    rent: 1425,
    monthlyFees: 0,
    moveInFees: null,
    availability: "available",
    image: "/illustrations/courtyard.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-gardenpoint",
    name: "Gardenpoint Row",
    city: "Jackson",
    address: "Illustrative location near Brownlee Road",
    latitude: 33.283,
    longitude: -83.971,
    bedrooms: 3,
    rent: 1599,
    monthlyFees: 50,
    moveInFees: 800,
    availability: "starting-price",
    image: "/illustrations/townhomes.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-brookpath",
    name: "Brookpath Townhomes",
    city: "Griffin",
    address: "Illustrative location near West Taylor Street",
    latitude: 33.246,
    longitude: -84.283,
    bedrooms: 3,
    rent: 1600,
    monthlyFees: 0,
    moveInFees: 900,
    availability: "available",
    image: "/illustrations/townhomes.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-claytonwoods",
    name: "Clayton Woods",
    city: "Jonesboro",
    address: "Illustrative location near Fayetteville Road",
    latitude: 33.517,
    longitude: -84.38,
    bedrooms: 3,
    rent: 1525,
    monthlyFees: 45,
    moveInFees: 650,
    availability: "available",
    image: "/illustrations/garden.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-lowell",
    name: "Lowell Cottage",
    city: "Jackson",
    address: "Illustrative location near North Oak Street",
    latitude: 33.3,
    longitude: -83.97,
    bedrooms: 1,
    rent: null,
    monthlyFees: null,
    moveInFees: null,
    availability: "call",
    image: "/illustrations/cottage.svg",
  },
  {
    ...DEMO_BASE,
    id: "demo-meadow",
    name: "Meadow Commons",
    city: "Atlanta",
    address: "Illustrative location in southeast Atlanta",
    latitude: 33.695,
    longitude: -84.376,
    bedrooms: 2,
    rent: 1050,
    monthlyFees: 50,
    moveInFees: 350,
    availability: "available",
    incomeRestricted: true,
    image: "/illustrations/brick.svg",
  },
];
