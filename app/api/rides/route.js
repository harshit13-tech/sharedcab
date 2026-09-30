import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const pickup = searchParams.get("pickup")?.trim() || "";
  const destination = searchParams.get("destination")?.trim() || "";

  let query = supabase
    .from("rides")
    .select("id,user_id,pickup,destination,departure_time,estimated_fare,seats_total,seats_available,status,created_at")
    .eq("status", "open")
    .gt("seats_available", 0)
    .order("departure_time", { ascending: true })
    .limit(50);

  if (pickup) query = query.ilike("pickup", `%${pickup}%`);
  if (destination) query = query.ilike("destination", `%${destination}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rides: data || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: "Please sign in before creating a ride." }, { status: 401 });
  }

  const body = await request.json();
  const pickup = String(body.pickup || "").trim();
  const destination = String(body.destination || "").trim();
  const departureTime = String(body.departureTime || "");
  const estimatedFare = Number(body.estimatedFare || 0);
  const seatsTotal = Number(body.seatsTotal || 2);

  if (!pickup || !destination || !departureTime || estimatedFare <= 0) {
    return NextResponse.json({ error: "Pickup, destination, departure time and fare are required." }, { status: 400 });
  }

  if (!Number.isInteger(seatsTotal) || seatsTotal < 1 || seatsTotal > 6) {
    return NextResponse.json({ error: "Seats must be between 1 and 6." }, { status: 400 });
  }

  const { data: ride, error } = await supabase
    .from("rides")
    .insert({
      user_id: userId,
      pickup,
      destination,
      departure_time: departureTime,
      estimated_fare: Math.round(estimatedFare),
      seats_total: seatsTotal,
      seats_available: seatsTotal - 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: memberError } = await supabase.from("ride_members").insert({
    ride_id: ride.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    await supabase.from("rides").delete().eq("id", ride.id).eq("user_id", userId);
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ ride }, { status: 201 });
}
