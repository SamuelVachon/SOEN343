import { NextResponse } from "next/server";
import { dbAdmin } from "@/app/api/lib/firebaseAdmin";

const RENTALS_COLLECTION = "rentals";

export async function POST(req: Request) {
  try {
    const { rentalId } = await req.json();

    if (!rentalId) {
      return NextResponse.json({ error: "rentalId is required" }, { status: 400 });
    }

    const rentalRef = dbAdmin.collection(RENTALS_COLLECTION).doc(rentalId);
    await rentalRef.update({
      startedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
