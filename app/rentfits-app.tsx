"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Bookmark,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Compass,
  ExternalLink,
  Heart,
  House,
  Info,
  Leaf,
  List,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import {
  DEMO_LISTINGS,
  DEFAULT_LIMITS,
  filterListings,
  monthlyTotal,
  type Listing,
} from "@/lib/rentals";

type Tab = "find" | "saved" | "budget" | "about";
type Mode = "demo" | "mine";
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
const cityOptions = [
  "College Park",
  "Riverdale",
  "Jonesboro",
  "Griffin",
  "Jackson",
  "Atlanta",
];
const demoIds = new Set(DEMO_LISTINGS.map((listing) => listing.id));
const statusNames: Record<Listing["availability"], string> = {
  available: "Available",
  "starting-price": "Starting price",
  call: "Call to confirm",
  unknown: "Needs confirmation",
};

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog?.close();
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <House size={22} strokeWidth={1.8} />
        <Leaf size={12} className="brand-leaf" />
      </span>
      <span>
        Rent<span className="brand-light">Fits</span>
        <span className="brand-dot">.</span>
      </span>
    </span>
  );
}
function HomeCard({
  listing,
  saved,
  onSave,
  onOpen,
  budgetMode,
  saveReady,
}: {
  listing: Listing;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  budgetMode: "base" | "monthly";
  saveReady: boolean;
}) {
  const total = monthlyTotal(listing);
  const displayed = budgetMode === "monthly" ? total : listing.rent;
  return (
    <article className="home-card">
      <div className="home-image-wrap">
        <button
          className="home-image-button"
          onClick={onOpen}
          aria-label={`View ${listing.name}`}
        >
          <img
            src={listing.image}
            alt="Illustration of a rental home; not a property photograph"
            className="home-image"
          />
        </button>
        <span
          className={`availability-badge ${listing.availability === "available" ? "badge-green" : ""}`}
        >
          <span />
          {statusNames[listing.availability]}
        </span>
        <button
          className={`save-button ${saved ? "is-saved" : ""}`}
          onClick={onSave}
          aria-label={`${saved ? "Unsave" : "Save"} ${listing.name}`}
          aria-pressed={saved}
          disabled={!saveReady}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        {listing.isDemo && (
          <span className="image-caption">Illustrative demo</span>
        )}
      </div>
      <div className="home-card-content">
        <div className="price-line">
          <strong>
            {displayed === null
              ? budgetMode === "monthly" && listing.rent !== null
                ? "Fees unknown"
                : "Price to confirm"
              : money(displayed)}
          </strong>
          {displayed !== null && (
            <span>
              / month
              {listing.availability === "starting-price" ? " · from" : ""}
            </span>
          )}
        </div>
        <button className="home-title-button" onClick={onOpen}>
          {listing.name}
          <ArrowUpRight size={17} />
        </button>
        <p className="location">
          <MapPin size={13} />
          {listing.city}, GA
        </p>
        <div className="home-facts">
          <span>
            <BedDouble size={16} />
            {listing.bedrooms} bedroom{listing.bedrooms > 1 ? "s" : ""}
          </span>
          <span>
            {listing.incomeRestricted ? "Income limits apply" : "Rental home"}
          </span>
        </div>
        <div className="card-footer">
          <span>
            {budgetMode === "base"
              ? listing.monthlyFees === null
                ? "Monthly fees not confirmed"
                : `+ ${money(listing.monthlyFees)} known monthly fees`
              : "Base rent + known required fees"}
          </span>
          <button
            onClick={onOpen}
            aria-label={`View details for ${listing.name}`}
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
function GeographicOverview({
  listings,
  onOpen,
}: {
  listings: Listing[];
  onOpen: (listing: Listing) => void;
}) {
  const plottable = listings.filter(
    (listing) =>
      typeof listing.latitude === "number" &&
      typeof listing.longitude === "number" &&
      Number.isFinite(listing.latitude) &&
      Number.isFinite(listing.longitude),
  );
  return (
    <div className="geographic-overview">
      <div className="overview-top">
        <div>
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h3>Atlanta & a little beyond.</h3>
        </div>
        <span className="overview-disclaimer">
          Location overview · not a street map
        </span>
      </div>
      <svg
        viewBox="0 0 800 400"
        role="img"
        aria-label="Approximate locations of matching properties"
      >
        <defs>
          <pattern
            id="map-dots"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#d2ddd0" />
          </pattern>
        </defs>
        <rect width="800" height="400" fill="#f0f3e9" />
        <rect width="800" height="400" fill="url(#map-dots)" />
        <path
          d="M40 320C170 255 168 145 300 120S488 50 620 85 700 185 790 190"
          fill="none"
          stroke="#e0e8d5"
          strokeWidth="75"
        />
        <path
          d="M430 10Q380 120 420 220T510 400"
          fill="none"
          stroke="#d8e7e7"
          strokeWidth="16"
        />
        <text
          x="385"
          y="37"
          fill="#657761"
          fontSize="14"
          fontFamily="sans-serif"
        >
          ATLANTA
        </text>
        <text
          x="153"
          y="153"
          fill="#86907e"
          fontSize="12"
          fontFamily="sans-serif"
        >
          SOUTH METRO
        </text>
        <text
          x="590"
          y="310"
          fill="#86907e"
          fontSize="12"
          fontFamily="sans-serif"
        >
          BEYOND THE CITY
        </text>
        {plottable.map((listing) => {
          const x = Math.max(
            30,
            Math.min(770, 400 + (listing.longitude! + 84.35) * 680),
          );
          const y = Math.max(
            40,
            Math.min(360, 50 + (33.77 - listing.latitude!) * 420),
          );
          return (
            <g key={listing.id} transform={`translate(${x},${y})`}>
              <foreignObject x="-40" y="-15" width="85" height="37">
                <button
                  className="map-marker"
                  aria-label={`View ${listing.name}, ${listing.city}`}
                  onClick={() => onOpen(listing)}
                >
                  {listing.rent === null ? "?" : money(listing.rent)}
                </button>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <p>
        {plottable.length
          ? "Markers use property coordinates. Demo properties are fictional; locations are approximate."
          : "No coordinates are available for these leads. Open a listing to check its street address."}
      </p>
    </div>
  );
}
function BudgetPanel() {
  const [income, setIncome] = useState("3200");
  const [expenses, setExpenses] = useState("1450");
  const [savings, setSavings] = useState("300");
  const [rent, setRent] = useState("1000");
  const [fees, setFees] = useState("65");
  const [utilities, setUtilities] = useState("150");
  const n = (value: string) => Math.max(0, Number(value) || 0);
  const housing = n(rent) + n(fees) + n(utilities);
  const remaining = n(income) - n(expenses) - n(savings) - housing;
  const fields = [
    { label: "Monthly take-home income", value: income, setter: setIncome },
    {
      label: "Other monthly expenses",
      value: expenses,
      setter: setExpenses,
      hint: "Food, transportation, debt payments, and other costs",
    },
    { label: "Monthly savings set aside", value: savings, setter: setSavings },
    { label: "Base rent", value: rent, setter: setRent },
    { label: "Required monthly rental fees", value: fees, setter: setFees },
    { label: "Estimated utilities", value: utilities, setter: setUtilities },
  ];
  return (
    <section className="budget-section">
      <div className="section-intro">
        <span className="eyebrow">MAKE ROOM FOR REAL LIFE</span>
        <h2>More than just the rent.</h2>
        <p>
          Use your own numbers to see how a home fits your monthly budget. These
          example amounts are editable.
        </p>
      </div>
      <div className="budget-layout">
        <form
          className="budget-form"
          onSubmit={(event) => event.preventDefault()}
        >
          {fields.map((field) => (
            <label className="field" key={field.label}>
              <span>{field.label}</span>
              <div className="currency-input">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={field.value}
                  onChange={(event) => field.setter(event.target.value)}
                />
              </div>
              {field.hint && <small>{field.hint}</small>}
            </label>
          ))}
        </form>
        <aside className="budget-result">
          <Wallet size={29} />
          <span className="eyebrow">YOUR MONTHLY PICTURE</span>
          <h3>{money(housing)}</h3>
          <p>Estimated total housing cost</p>
          <div className="budget-lines">
            <span>
              Take-home income<strong>{money(n(income))}</strong>
            </span>
            <span>
              Other expenses<strong>−{money(n(expenses))}</strong>
            </span>
            <span>
              Savings set aside<strong>−{money(n(savings))}</strong>
            </span>
            <span>
              Housing cost<strong>−{money(housing)}</strong>
            </span>
          </div>
          <div className={`remaining ${remaining < 0 ? "negative" : ""}`}>
            <span>
              {remaining < 0 ? "Monthly shortfall" : "Money remaining"}
            </span>
            <strong>{money(Math.abs(remaining))}</strong>
          </div>
          <p className="budget-footnote">
            A planning estimate based on your inputs. Move-in costs are
            separate; leave room for expenses you haven’t entered.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default function RentFitsApp() {
  const [tab, setTab] = useState<Tab>("find");
  const [mode, setMode] = useState<Mode>("demo");
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [bedrooms, setBedrooms] = useState<number | "all">("all");
  const [city, setCity] = useState("all");
  const [maxRent, setMaxRent] = useState("");
  const [budgetMode, setBudgetMode] = useState<"base" | "monthly">("base");
  const [sort, setSort] = useState<"price" | "newest" | "city">("price");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [includeIncomeRestricted, setIncludeIncomeRestricted] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [mine, setMine] = useState<Listing[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [details, setDetails] = useState<Listing | null>(null);
  const [adding, setAdding] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveReady, setSaveReady] = useState(false);
  const [removing, setRemoving] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    let local: string[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("rentfits.saved") || "[]");
      if (Array.isArray(parsed))
        local = parsed.filter(
          (value): value is string => typeof value === "string",
        );
    } catch {}
    setSavedIds(local);
    const listingsRequest = fetch("/api/listings").then(async (response) => {
      if (!response.ok)
        throw new Error(
          "Could not load your listings. Please reload to try again.",
        );
      return (await response.json()) as {
        listings?: Listing[];
        authenticated?: boolean;
      };
    });
    const savedRequest = fetch("/api/saved")
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              ids?: string[];
              authenticated?: boolean;
            })
          : null,
      )
      .catch(() => null);
    Promise.all([listingsRequest, savedRequest])
      .then(([records, saved]) => {
        if (!active) return;
        const owned = Array.isArray(records.listings) ? records.listings : [];
        setMine(owned);
        setAuthenticated(Boolean(records.authenticated));
        const merged = [
          ...new Set<string>([
            ...local.filter((id) => demoIds.has(id)),
            ...(saved?.authenticated && Array.isArray(saved.ids)
              ? saved.ids.filter((id) =>
                  owned.some((listing) => listing.id === id),
                )
              : []),
          ]),
        ];
        setSavedIds(merged);
        try {
          localStorage.setItem("rentfits.saved", JSON.stringify(merged));
        } catch {}
        setSaveReady(true);
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message);
          setSaveReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const toggleSave = (listing: Listing) => {
    if (!saveReady || removing) return;
    const next = savedIds.includes(listing.id)
      ? savedIds.filter((id) => id !== listing.id)
      : [...savedIds, listing.id];
    setSavedIds(next);
    try {
      localStorage.setItem("rentfits.saved", JSON.stringify(next));
      setNotice(
        listing.isDemo || !authenticated
          ? next.includes(listing.id)
            ? "Home saved on this device."
            : "Home removed from your saved list."
          : "Saving your home…",
      );
    } catch {
      setNotice(
        "Your browser cannot store saved homes. They will last for this visit only.",
      );
    }
    if (authenticated && !listing.isDemo) {
      const accountIds = next.filter((id) =>
        mine.some((record) => record.id === id),
      );
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          const response = await fetch("/api/saved", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: accountIds }),
          });
          setNotice(
            response.ok
              ? "Saved list updated in your account."
              : "Saved on this device. Account sync failed; please try again.",
          );
        } catch {
          setNotice(
            "Saved on this device. Account sync failed; please try again.",
          );
        }
      });
    }
  };
  const removeLead = async (listing: Listing) => {
    setRemoving(true);
    try {
      await saveQueue.current;
      const response = await fetch("/api/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listing.id }),
      });
      if (!response.ok)
        throw new Error("Could not remove your lead. Please try again.");
      setMine((previous) => previous.filter((item) => item.id !== listing.id));
      const next = savedIds.filter((id) => id !== listing.id);
      setSavedIds(next);
      try {
        localStorage.setItem("rentfits.saved", JSON.stringify(next));
      } catch {}
      setDetails(null);
      setNotice("Rental lead removed.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not remove your lead.",
      );
    } finally {
      setRemoving(false);
    }
  };
  const currentListings = mode === "demo" ? DEMO_LISTINGS : mine;
  const filters = {
    query,
    bedrooms,
    city,
    budgetMode,
    maxRent: maxRent.trim() ? Number(maxRent) : null,
    onlyAvailable,
    includeIncomeRestricted,
    savedOnly: tab === "saved",
    savedIds,
    sort,
  };
  const matching = filterListings(currentListings, filters);
  const unpriced =
    mode === "mine"
      ? currentListings.filter(
          (listing) =>
            (listing.rent === null ||
              (budgetMode === "monthly" && listing.monthlyFees === null)) &&
            (!query ||
              `${listing.name} ${listing.city} ${listing.address}`
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (bedrooms === "all" || listing.bedrooms === bedrooms) &&
            (city === "all" || listing.city === city) &&
            (!onlyAvailable || listing.availability === "available") &&
            (includeIncomeRestricted || !listing.incomeRestricted) &&
            (tab !== "saved" || savedIds.includes(listing.id)),
        )
      : [];
  const clearFilters = () => {
    setQuery("");
    setDraftQuery("");
    setBedrooms("all");
    setCity("all");
    setMaxRent("");
    setBudgetMode("base");
    setOnlyAvailable(false);
    setIncludeIncomeRestricted(true);
  };
  const addListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const numeric = (key: string) =>
      String(form.get(key) || "").trim() ? Number(form.get(key)) : null;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          city: form.get("city"),
          address: form.get("address"),
          bedrooms: Number(form.get("bedrooms")),
          rent: numeric("rent"),
          monthlyFees: numeric("monthlyFees"),
          moveInFees: numeric("moveInFees"),
          latitude: null,
          longitude: null,
          availability: "unknown",
          sourceUrl: String(form.get("sourceUrl") || "").trim() || null,
          incomeRestricted: form.get("incomeRestricted") === "on",
          evictionPolicy: "unknown",
          policyNotes: null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        fieldErrors?: Record<string, string>;
        listing?: Listing;
      };
      if (!response.ok)
        throw new Error(
          data.fieldErrors
            ? Object.values(data.fieldErrors).join(" ")
            : data.error ||
                "Could not add this listing. Please check your entries.",
        );
      if (!data.listing)
        throw new Error("The server did not return the saved listing.");
      const created = data.listing;
      setMine((previous) => [created, ...previous]);
      setAdding(false);
      setMode("mine");
      setTab("find");
      clearFilters();
      setNotice(
        "Your rental lead has been added. Confirm price and availability with the property.",
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not add this listing.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: "find", label: "Find homes", icon: Search },
    { id: "saved", label: "Saved homes", icon: Heart },
    { id: "budget", label: "My budget", icon: Calculator },
    { id: "about", label: "How it works", icon: CircleHelp },
  ];
  return (
    <div className="rentfits-app">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand-button"
            onClick={() => setTab("find")}
            aria-label="RentFits home"
          >
            <Brand />
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
              >
                <Icon size={16} />
                <span>{label}</span>
                {id === "saved" && savedIds.length > 0 && (
                  <span className="nav-count">{savedIds.length}</span>
                )}
              </button>
            ))}
          </nav>
          <a
            className="sign-in"
            href={
              authenticated
                ? "/signout-with-chatgpt?return_to=/"
                : "/signin-with-chatgpt?return_to=/"
            }
            target="_top"
          >
            {authenticated ? "Sign out" : "Sign in"}
            <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <div className="demo-banner">
        <Info size={15} />
        <span>
          {mode === "demo" ? (
            <>
              <strong>You’re exploring the demo.</strong> These homes and prices
              are fictional. Live discovery is not connected.
            </>
          ) : (
            <>
              <strong>Your rental leads.</strong> Entries are saved by you;
              prices and availability need confirmation.
            </>
          )}
        </span>
        <button
          onClick={() => {
            setMode(mode === "demo" ? "mine" : "demo");
            setTab("find");
            clearFilters();
          }}
        >
          {mode === "demo" ? "View my listings" : "Explore the demo"}
          <ArrowRight size={13} />
        </button>
      </div>
      <main className="main-shell">
        {(tab === "find" || tab === "saved") && (
          <>
            {tab === "find" ? (
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="tiny-star">✦</span> ATLANTA & BEYOND
                  </div>
                  <h1>
                    A home that fits
                    <br />
                    your <span>budget.</span>
                  </h1>
                  <p>
                    Good places shouldn’t be hard to find. Discover rental
                    options, understand the fees, and make room for what
                    matters.
                  </p>
                </div>
                <div className="hero-aside">
                  <div className="hero-illustration">
                    <span className="sun" />
                    <div className="hero-house house-back">
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="hero-house house-front">
                      <span />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="hero-tree tree-one" />
                    <div className="hero-tree tree-two" />
                    <div className="hero-ground" />
                  </div>
                  <span className="hero-aside-caption">
                    <Leaf size={14} /> A little more possibility. A little less
                    rent.
                  </span>
                </div>
              </section>
            ) : (
              <section className="saved-intro">
                <span className="eyebrow">A PLACE FOR YOUR POSSIBILITIES</span>
                <h1>
                  Your saved homes<span>.</span>
                </h1>
                <p>
                  Keep the places you like together, then compare the details.{" "}
                  {mode === "demo" || !authenticated
                    ? "Saved on this device."
                    : "Saved to your account."}
                </p>
              </section>
            )}
            <section
              className="search-panel"
              aria-label="Rental search filters"
            >
              <form
                className="search-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  setQuery(draftQuery.trim());
                }}
              >
                <label className="search-input">
                  <Search size={20} />
                  <span className="sr-only">
                    Search property, city, or address
                  </span>
                  <input
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="City, neighborhood, or property"
                  />
                </label>
                <label className="search-select">
                  <span>Bedrooms</span>
                  <select
                    value={bedrooms}
                    onChange={(event) =>
                      setBedrooms(
                        event.target.value === "all"
                          ? "all"
                          : Number(event.target.value),
                      )
                    }
                  >
                    <option value="all">Any bedroom</option>
                    <option value="1">1 bedroom</option>
                    <option value="2">2 bedrooms</option>
                    <option value="3">3 bedrooms</option>
                  </select>
                  <ChevronDown size={15} />
                </label>
                <label className="search-select">
                  <span>Area</span>
                  <select
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  >
                    <option value="all">All areas</option>
                    {[
                      ...new Set([
                        ...cityOptions,
                        ...mine.map((listing) => listing.city),
                      ]),
                    ].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </label>
                <button className="primary-button search-submit" type="submit">
                  Find my fit
                  <ArrowRight size={17} />
                </button>
              </form>
              <div className="search-bottom">
                <div className="preset-label">YOUR STARTING LIMITS</div>
                <div className="rent-presets">
                  {[1, 2, 3].map((bed) => (
                    <button
                      key={bed}
                      aria-pressed={bedrooms === bed}
                      className={bedrooms === bed ? "active" : ""}
                      onClick={() => {
                        setBedrooms(bedrooms === bed ? "all" : bed);
                        setMaxRent("");
                      }}
                    >
                      <BedDouble size={14} />
                      {bed} bed{" "}
                      <strong>
                        {bed === 3 ? "<" : "≤"}{" "}
                        {money(DEFAULT_LIMITS[bed as 1 | 2 | 3])}
                      </strong>
                    </button>
                  ))}
                </div>
                <label className="custom-limit">
                  <span>Custom ceiling</span>
                  <div>
                    <span>$</span>
                    <input
                      aria-label="Custom maximum rent"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Optional"
                      value={maxRent}
                      onChange={(event) => setMaxRent(event.target.value)}
                    />
                  </div>
                </label>
              </div>
            </section>
            <div className="filters-bar">
              <div className="segmented" aria-label="Price calculation">
                <button
                  aria-pressed={budgetMode === "base"}
                  className={budgetMode === "base" ? "selected" : ""}
                  onClick={() => setBudgetMode("base")}
                >
                  Base rent
                </button>
                <button
                  aria-pressed={budgetMode === "monthly"}
                  className={budgetMode === "monthly" ? "selected" : ""}
                  onClick={() => setBudgetMode("monthly")}
                >
                  Rent + fees
                </button>
              </div>
              <label className="check-filter">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(event) => setOnlyAvailable(event.target.checked)}
                />
                Available units only
              </label>
              <label className="check-filter">
                <input
                  type="checkbox"
                  checked={includeIncomeRestricted}
                  onChange={(event) =>
                    setIncludeIncomeRestricted(event.target.checked)
                  }
                />
                Include income-restricted homes
              </label>
              <button className="reset-button" onClick={clearFilters}>
                Reset filters
              </button>
            </div>
            {budgetMode === "monthly" && (
              <p className="filter-note">
                <Info size={14} />
                Only homes with known base rent and monthly fees can match this
                total. Utilities and move-in costs are separate.
              </p>
            )}
            <section className="results-section">
              <div className="results-heading">
                <div>
                  <span className="eyebrow">
                    {mode === "demo"
                      ? "EXPLORE THE POSSIBILITIES"
                      : "YOUR RENTAL NOTEBOOK"}
                  </span>
                  <h2>
                    {matching.length} {tab === "saved" ? "saved " : ""}home
                    {matching.length === 1 ? "" : "s"} within your limits
                    <span className="results-dot">.</span>
                  </h2>
                  <p>
                    {mode === "demo"
                      ? "Fictional listings to try the search. No live availability."
                      : "Keep useful leads together and check the details at the source."}
                  </p>
                </div>
                <div className="results-actions">
                  <div className="mode-select segmented">
                    <button
                      aria-pressed={mode === "demo"}
                      className={mode === "demo" ? "selected" : ""}
                      onClick={() => {
                        setMode("demo");
                        clearFilters();
                      }}
                    >
                      Demo
                    </button>
                    <button
                      aria-pressed={mode === "mine"}
                      className={mode === "mine" ? "selected" : ""}
                      onClick={() => {
                        setMode("mine");
                        clearFilters();
                      }}
                    >
                      My listings
                    </button>
                  </div>
                  <button
                    className="secondary-button add-lead"
                    onClick={() => {
                      setAdding(true);
                      setSubmitError("");
                    }}
                  >
                    <Plus size={15} />
                    Add a lead
                  </button>
                </div>
              </div>
              <div className="results-tools">
                <span className="results-area">
                  <MapPin size={14} />
                  {city === "all"
                    ? "Metro Atlanta & surrounding towns"
                    : `${city}, Georgia`}
                </span>
                <div>
                  <label className="sort-control">
                    Sort by
                    <select
                      value={sort}
                      onChange={(event) =>
                        setSort(event.target.value as typeof sort)
                      }
                    >
                      <option value="price">Lowest price</option>
                      <option value="city">City</option>
                      <option value="newest">Last checked</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
                  <div className="view-switch">
                    <button
                      aria-label="Show listing grid"
                      aria-pressed={view === "list"}
                      className={view === "list" ? "active" : ""}
                      onClick={() => setView("list")}
                    >
                      <List size={18} />
                    </button>
                    <button
                      aria-label="Show location overview"
                      aria-pressed={view === "map"}
                      className={view === "map" ? "active" : ""}
                      onClick={() => setView("map")}
                    >
                      <Compass size={18} />
                    </button>
                  </div>
                </div>
              </div>
              {loadError && mode === "mine" && (
                <div className="error-message" role="alert">
                  {loadError}
                </div>
              )}
              {view === "map" && matching.length > 0 && (
                <GeographicOverview listings={matching} onOpen={setDetails} />
              )}
              {matching.length > 0 ? (
                <div className="home-grid">
                  {matching.map((listing) => (
                    <HomeCard
                      key={listing.id}
                      listing={listing}
                      saved={savedIds.includes(listing.id)}
                      onSave={() => toggleSave(listing)}
                      onOpen={() => setDetails(listing)}
                      budgetMode={budgetMode}
                      saveReady={saveReady && !removing}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>
                    <House size={32} />
                  </span>
                  <h3>
                    {mode === "mine" && mine.length === 0
                      ? "Your next home starts with a lead."
                      : tab === "saved"
                        ? "Make room for your favorites."
                        : "No homes match these filters."}
                  </h3>
                  <p>
                    {mode === "mine" && mine.length === 0
                      ? "Add a rental you’ve found to compare its rent and fees. This version uses your own source-based leads."
                      : tab === "saved"
                        ? "Tap the heart on a home to save it, or adjust your filters to see more saved options."
                        : "Try another area, adjust your ceiling, or include more availability types."}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      if (mode === "mine" && mine.length === 0) setAdding(true);
                      else if (tab === "saved") {
                        setTab("find");
                        clearFilters();
                      } else clearFilters();
                    }}
                  >
                    {mode === "mine" && mine.length === 0
                      ? "Add your first lead"
                      : tab === "saved"
                        ? "Find homes"
                        : "Clear filters"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {unpriced.length > 0 && (
                <div className="unpriced-section">
                  <h3>Leads to check</h3>
                  <p>
                    These leads have incomplete pricing for this view and aren’t
                    counted as budget matches.
                  </p>
                  <div className="home-grid">
                    {unpriced.map((listing) => (
                      <HomeCard
                        key={listing.id}
                        listing={listing}
                        saved={savedIds.includes(listing.id)}
                        onSave={() => toggleSave(listing)}
                        onOpen={() => setDetails(listing)}
                        budgetMode={budgetMode}
                        saveReady={saveReady && !removing}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
            <section className="promise-strip">
              <span className="promise-icon">
                <ShieldCheck size={27} />
              </span>
              <div>
                <h3>The details make the difference.</h3>
                <p>
                  Check the real cost, confirm availability, and always verify a
                  property before applying.
                </p>
              </div>
              <button onClick={() => setTab("about")}>
                How RentFits works
                <ArrowRight size={16} />
              </button>
            </section>
          </>
        )}
        {tab === "budget" && <BudgetPanel />}
        {tab === "about" && (
          <section className="about-section">
            <div className="section-intro">
              <span className="eyebrow">BUILT AROUND YOUR BUDGET</span>
              <h1>
                A clearer way
                <br />
                to find your fit<span>.</span>
              </h1>
              <p>
                Affordable rentals can be scattered across property websites,
                local directories, and small landlords. RentFits gives your
                discoveries a place to come together.
              </p>
            </div>
            <div className="about-cards">
              <article>
                <span className="step-number">01</span>
                <Search size={26} />
                <h3>Discover the overlooked</h3>
                <p>
                  Find leads in property websites, local directories, and
                  permitted classifieds. Add their details and source links to
                  your private rental notebook.
                </p>
              </article>
              <article>
                <span className="step-number">02</span>
                <Wallet size={26} />
                <h3>Understand the real cost</h3>
                <p>
                  Compare base rent with known mandatory monthly fees. Starting
                  prices, income limits, and unconfirmed details stay clearly
                  labeled.
                </p>
              </article>
              <article>
                <span className="step-number">03</span>
                <Bookmark size={26} />
                <h3>Keep your possibilities</h3>
                <p>
                  Save homes and check source pages. Ask the property about
                  availability, move-in costs, and screening criteria before
                  applying.
                </p>
              </article>
            </div>
            <div className="connection-status">
              <span className="status-dot" />
              <div>
                <strong>
                  Manual sources are ready. Automatic discovery is a future
                  phase.
                </strong>
                <p>
                  This first version supports your own rental leads, saved
                  homes, and a budget calculator. The demo uses fictional
                  properties. Future geographic discovery will use approved
                  sources and will not cover every rental.
                </p>
              </div>
            </div>
            <div className="about-note">
              <Info size={21} />
              <p>
                Rental prices change. A listing is a lead, not a guarantee of
                availability or approval. Prior-eviction screening policies must
                be confirmed directly with each property; new personal leads are
                marked as unconfirmed.
              </p>
            </div>
            <button className="primary-button" onClick={() => setTab("find")}>
              Explore RentFits
              <ArrowRight size={16} />
            </button>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <Brand />
          <p>A home that fits your budget.</p>
        </div>
        <span>Made for Atlanta. Built for possibility.</span>
        <button onClick={() => setTab("about")}>
          About RentFits
          <ArrowUpRight size={14} />
        </button>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {details && (
        <Modal title={details.name} onClose={() => setDetails(null)} wide>
          <div className="detail-layout">
            <div className="detail-image">
              <img
                src={details.image}
                alt="Illustration of a rental home; not a property photograph"
              />
              {details.isDemo && <span>Fictional demo property</span>}
            </div>
            <div className="detail-body">
              <p className="location">
                <MapPin size={15} />
                {details.address}, {details.city}, GA
              </p>
              <div className="detail-price">
                {details.rent === null
                  ? "Price to confirm"
                  : money(details.rent)}
                {details.rent !== null && <span>/ month base rent</span>}
              </div>
              <p className="detail-availability">
                <span className="status-dot" />
                {statusNames[details.availability]} · {details.bedrooms} bedroom
                {details.bedrooms > 1 ? "s" : ""}
              </p>
              <div className="cost-breakdown">
                <h3>See the full picture</h3>
                <div>
                  <span>Base rent</span>
                  <strong>
                    {details.rent === null ? "Unknown" : money(details.rent)}
                  </strong>
                </div>
                <div>
                  <span>Required monthly fees</span>
                  <strong>
                    {details.monthlyFees === null
                      ? "Unknown"
                      : money(details.monthlyFees)}
                  </strong>
                </div>
                <div className="total-line">
                  <span>Known monthly total</span>
                  <strong>
                    {monthlyTotal(details) === null
                      ? "Needs confirmation"
                      : money(monthlyTotal(details)!)}
                  </strong>
                </div>
                <div>
                  <span>Reported move-in fees</span>
                  <strong>
                    {details.moveInFees === null
                      ? "Unknown"
                      : money(details.moveInFees)}
                  </strong>
                </div>
                <small>
                  Utilities, deposits, and other charges may be additional. Ask
                  for a complete written fee breakdown.
                </small>
              </div>
              <div className="detail-policy">
                <ShieldCheck size={18} />
                <div>
                  <strong>
                    Screening policy:{" "}
                    {details.evictionPolicy === "unknown"
                      ? "not confirmed"
                      : details.evictionPolicy === "case-by-case"
                        ? "case-by-case review reported"
                        : "acceptance reported"}
                  </strong>
                  <p>
                    {details.policyNotes ||
                      "Ask the property directly about prior evictions, income requirements, and application criteria before paying fees."}
                  </p>
                </div>
              </div>
              {details.incomeRestricted && (
                <p className="income-note">
                  <Info size={16} />
                  Income restrictions apply. Verify eligibility and program
                  requirements.
                </p>
              )}
              <div className="source-note">
                <span>
                  {details.isDemo
                    ? "Demo data · no live source"
                    : details.sourceLabel}
                </span>
                <span>
                  {details.checkedAt
                    ? `Checked ${new Date(details.checkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "Price and availability not independently checked"}
                </span>
              </div>
              <div className="detail-buttons">
                <button
                  className="primary-button"
                  disabled={!saveReady || removing}
                  onClick={() => toggleSave(details)}
                >
                  <Heart
                    size={16}
                    fill={
                      savedIds.includes(details.id) ? "currentColor" : "none"
                    }
                  />
                  {savedIds.includes(details.id)
                    ? "Saved home"
                    : "Save this home"}
                </button>
                {details.sourceUrl ? (
                  <a
                    className="secondary-button"
                    href={details.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit source
                    <ExternalLink size={15} />
                  </a>
                ) : (
                  <span className="no-source">No source website supplied</span>
                )}
                {!details.isDemo && authenticated && (
                  <button
                    className="remove-lead"
                    disabled={removing}
                    onClick={() => removeLead(details)}
                  >
                    {removing ? "Removing…" : "Remove this lead"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal title="Add a rental lead" onClose={() => setAdding(false)}>
          {!authenticated ? (
            <div className="sign-in-prompt">
              <span className="empty-icon">
                <House size={30} />
              </span>
              <h3>Your leads deserve a place.</h3>
              <p>
                Sign in to add your own rental leads and keep them in your
                account. Demo favorites can be saved on this device.
              </p>
              <a
                className="primary-button"
                href="/signin-with-chatgpt?return_to=/"
                target="_top"
              >
                Sign in to add a lead
                <ArrowUpRight size={16} />
              </a>
            </div>
          ) : (
            <form className="add-form" onSubmit={addListing}>
              <p className="form-intro">
                Add a property you found. Leave unknown amounts blank; enter 0
                only if you’ve confirmed there is no fee.
              </p>
              <label className="field">
                <span>Property name</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Apartment community or rental name"
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>City</span>
                  <input
                    name="city"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="College Park"
                  />
                </label>
                <label className="field">
                  <span>Bedrooms</span>
                  <select name="bedrooms" defaultValue="1">
                    <option value="1">1 bedroom</option>
                    <option value="2">2 bedrooms</option>
                    <option value="3">3 bedrooms</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Street address</span>
                <input
                  name="address"
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="Street number and street name"
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Base rent / month</span>
                  <input
                    name="rent"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Unknown"
                  />
                </label>
                <label className="field">
                  <span>Required monthly fees</span>
                  <input
                    name="monthlyFees"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unknown"
                  />
                </label>
              </div>
              <label className="field">
                <span>Reported move-in fees</span>
                <input
                  name="moveInFees"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unknown; deposits may be separate"
                />
              </label>
              <label className="field">
                <span>
                  Source website <small>(optional)</small>
                </span>
                <input
                  name="sourceUrl"
                  type="url"
                  pattern="https://.*"
                  title="Use a public HTTPS website address"
                  placeholder="https://property-website.com"
                />
              </label>
              <label className="check-filter">
                <input type="checkbox" name="incomeRestricted" />
                This property has income restrictions
              </label>
              <div className="form-note">
                <Info size={15} />
                New leads are marked “needs confirmation.” Screening policies
                remain unconfirmed.
              </div>
              {submitError && (
                <div className="error-message" role="alert">
                  {submitError}
                </div>
              )}
              <button
                className="primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving your lead…" : "Add rental lead"}
                <Plus size={17} />
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
