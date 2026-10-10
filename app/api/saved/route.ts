import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { rentalLeads, savedRentals } from "../../../db/schema";
import { DEMO_LISTINGS } from "../../../lib/rentals";
import { ApiError, privateJson, readJson, routeError } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return privateJson({ ids: [], authenticated: false });
    const [row] = await getDb()
      .select()
      .from(savedRentals)
      .where(eq(savedRentals.ownerId, user.userId))
      .limit(1);
    return privateJson({ ids: row?.ids ?? [], authenticated: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new ApiError(401, "Sign in to sync saved rentals.");
    const payload = await readJson(request);
    const ids =
      payload && typeof payload === "object" && "ids" in payload
        ? payload.ids
        : null;
    if (
      !Array.isArray(ids) ||
      ids.length > 250 ||
      !ids.every((id) => typeof id === "string" && id.length < 100)
    ) {
      throw new ApiError(400, "Choose up to 250 rentals to save.");
    }
    const db = getDb();
    const owned = await db
      .select({ id: rentalLeads.id })
      .from(rentalLeads)
      .where(eq(rentalLeads.ownerId, user.userId));
    const allowed = new Set([
      ...DEMO_LISTINGS.map((listing) => listing.id),
      ...owned.map((row) => row.id),
    ]);
    if (ids.some((id) => !allowed.has(id)))
      throw new ApiError(400, "One of these rentals isn't in your collection.");
    const values = {
      ownerId: user.userId,
      ids: [...new Set(ids)],
      updatedAt: new Date().toISOString(),
    };
    await db
      .insert(savedRentals)
      .values(values)
      .onConflictDoUpdate({
        target: savedRentals.ownerId,
        set: { ids: values.ids, updatedAt: values.updatedAt },
      });
    return privateJson({ ids: values.ids, authenticated: true });
  } catch (error) {
    return routeError(error);
  }
}
