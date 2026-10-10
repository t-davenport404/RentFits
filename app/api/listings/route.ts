import { and, desc, eq, count } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { rentalLeads, savedRentals } from "../../../db/schema";
import {
  parseListingInput,
  RentalValidationError,
  type Listing,
} from "../../../lib/rentals";
import { ApiError, privateJson, readJson, routeError } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return privateJson({ listings: [], authenticated: false });
    const rows = await getDb()
      .select({ listing: rentalLeads.listing })
      .from(rentalLeads)
      .where(eq(rentalLeads.ownerId, user.userId))
      .orderBy(desc(rentalLeads.createdAt))
      .limit(200);
    return privateJson({
      listings: rows.map((row) => row.listing),
      authenticated: true,
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new ApiError(401, "Sign in to save a rental lead.");
    const input = parseListingInput(await readJson(request));
    const db = getDb();
    const canonical = [input.name, input.address, input.city, input.bedrooms]
      .map((value) => String(value).trim().toLowerCase().replace(/\s+/g, " "))
      .join("|");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonical),
    );
    const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const existing = await db
      .select({ id: rentalLeads.id })
      .from(rentalLeads)
      .where(
        and(
          eq(rentalLeads.ownerId, user.userId),
          eq(rentalLeads.fingerprint, fingerprint),
        ),
      )
      .limit(1);
    if (existing.length)
      throw new ApiError(409, "You've already added this rental lead.");
    const [total] = await db
      .select({ total: count() })
      .from(rentalLeads)
      .where(eq(rentalLeads.ownerId, user.userId));
    if (total.total >= 200)
      throw new ApiError(
        409,
        "Your lead collection has reached 200 rentals. Remove a lead before adding another.",
      );
    const id = `lead-${crypto.randomUUID()}`;
    const listing: Listing = {
      ...input,
      id,
      latitude: input.latitude,
      longitude: input.longitude,
      sourceLabel: "Your saved lead — not independently verified",
      checkedAt: null,
      image: "/illustrations/courtyard.svg",
      isDemo: false,
    };
    // Unknown coordinates stay null rather than creating a fictitious location.
    await db
      .insert(rentalLeads)
      .values({
        id,
        ownerId: user.userId,
        fingerprint,
        listing,
        createdAt: new Date().toISOString(),
      });
    return privateJson({ listing, authenticated: true }, 201);
  } catch (error) {
    if (error instanceof RentalValidationError)
      return privateJson(
        { error: error.message, fieldErrors: error.fieldErrors },
        400,
      );
    if (
      error instanceof Error &&
      String(error.cause ?? error.message).includes("UNIQUE constraint")
    ) {
      return privateJson(
        { error: "You've already added this rental lead." },
        409,
      );
    }
    return routeError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new ApiError(401, "Sign in to remove a rental lead.");
    const payload = await readJson(request);
    const id =
      payload && typeof payload === "object" && "id" in payload
        ? payload.id
        : null;
    if (typeof id !== "string" || !/^lead-[a-f0-9-]{36}$/.test(id))
      throw new ApiError(400, "Select a saved rental lead.");
    const db = getDb();
    const rows = await db
      .delete(rentalLeads)
      .where(and(eq(rentalLeads.id, id), eq(rentalLeads.ownerId, user.userId)))
      .returning({ id: rentalLeads.id });
    if (!rows.length)
      throw new ApiError(
        404,
        "This rental lead is no longer in your collection.",
      );
    const [saved] = await db
      .select()
      .from(savedRentals)
      .where(eq(savedRentals.ownerId, user.userId))
      .limit(1);
    if (saved?.ids.includes(id)) {
      await db
        .update(savedRentals)
        .set({
          ids: saved.ids.filter((savedId) => savedId !== id),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(savedRentals.ownerId, user.userId));
    }
    return privateJson({ deleted: id });
  } catch (error) {
    return routeError(error);
  }
}
