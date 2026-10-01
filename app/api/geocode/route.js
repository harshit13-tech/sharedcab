import { NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    // Text search: location name → latitude/longitude
    if (query) {
      const url = new URL(`${NOMINATIM_URL}/search`);

      url.searchParams.set("q", `${query}, Bengaluru, India`);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "5");
      url.searchParams.set("countrycodes", "in");
      url.searchParams.set("addressdetails", "1");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "SharedRide-Bengaluru/0.1",
        },
        next: {
          revalidate: 300,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "Location search failed." },
          { status: 502 }
        );
      }

      const results = await response.json();

      return NextResponse.json({ results });
    }

    // Reverse search: latitude/longitude → location name
    if (lat && lon) {
      const url = new URL(`${NOMINATIM_URL}/reverse`);

      url.searchParams.set("lat", lat);
      url.searchParams.set("lon", lon);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "SharedRide-Bengaluru/0.1",
        },
        next: {
          revalidate: 300,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "Location lookup failed." },
          { status: 502 }
        );
      }

      const result = await response.json();

      return NextResponse.json({ result });
    }

    return NextResponse.json(
      { error: "Provide either q or lat/lon." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Geocoding error:", error);

    return NextResponse.json(
      { error: "Geocoding service unavailable." },
      { status: 500 }
    );
  }
}
