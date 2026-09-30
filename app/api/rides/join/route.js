import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: "Please sign in before joining a ride." }, { status: 401 });
  }

  const { rideId } = await request.json();
  if (!rideId) return NextResponse.json({ error: "Ride ID is required." }, { status: 400 });

  const { data: existing } = await supabase
    .from("ride_members")
    .select("id")
    .eq("ride_id", rideId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return NextResponse.json({ message: "You are already in this ride." });

  const { data: ride, error: rideError } = await supabase
    .from("rides")
    .select("id,seats_available,status")
    .eq("id", rideId)
    .single();

  if (rideError || !ride) return NextResponse.json({ error: "Ride not found." }, { status: 404 });
  if (ride.status !== "open" || ride.seats_available <= 0) {
    return NextResponse.json({ error: "This ride is full or closed." }, { status: 409 });
  }

  const { error: memberError } = await supabase.from("ride_members").insert({
    ride_id: rideId,
    user_id: userId,
    role: "member",
  });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });

  const { data: updatedRide, error: updateError } = await supabase
    .from("rides")
    .update({ seats_available: ride.seats_available - 1, status: ride.seats_available - 1 === 0 ? "full" : "open" })
    .eq("id", rideId)
    .eq("seats_available", ride.seats_available)
    .select("id,seats_available,status")
    .maybeSingle();

  if (updateError || !updatedRide) {
    await supabase.from("ride_members").delete().eq("ride_id", rideId).eq("user_id", userId);
    return NextResponse.json({ error: "Could not reserve the seat. Please try again." }, { status: 409 });
  }

  return NextResponse.json({ message: "You joined the ride.", ride: updatedRide });
}
