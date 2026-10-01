import { NextResponse } from "next/server";

const PHOTON_URL = "https://photon.komoot.io";

function buildDisplayName(properties = {}) {
  const parts = [
    properties.name,
    properties.street
      ? `${properties.street}${
          properties.housenumber ? ` ${properties.housenumber}` : ""
        }`
      : null,
    properties.locality,
    properties.district,
    properties.city,
    properties.state,
    properties.postcode,
  ].filter(Boolean);

  return [...new Set(parts)].join(", ");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    // SEARCH
    if (query) {
      const url = new URL(`${PHOTON_URL}/api/`);

      url.searchParams.set("q", `${query}, Bengaluru, India`);
      url.searchParams.set("limit", "6");

      // Prefer results around Bengaluru
      url.searchParams.set("lat", "12.9716");
      url.searchParams.set("lon", "77.5946");
      url.searchParams.set("zoom", "11");
      url.searchParams.set("location_bias_scale", "0.2");

      url.searchParams.set("lang", "en");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "SharedCab-Bengaluru/1.0",
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

      const data = await response.json();

      const results = (data.features || [])
        .map((feature) => {
          const coordinates = feature.geometry?.coordinates;

          if (!coordinates || coordinates.length < 2) {
            return null;
          }

          return {
            id: `${feature.properties?.osm_type || "place"}-${
              feature.properties?.osm_id || coordinates.join("-")
            }`,
            display_name: buildDisplayName(feature.properties),
            lat: Number(coordinates[1]),
            lon: Number(coordinates[0]),
          };
        })
        .filter((result) => result && result.display_name);

      return NextResponse.json({ results });
    }

    // REVERSE GEOCODING
    if (lat && lon) {
      const url = new URL(`${PHOTON_URL}/reverse`);

      url.searchParams.set("lat", lat);
      url.searchParams.set("lon", lon);
      url.searchParams.set("lang", "en");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "SharedCab-Bengaluru/1.0",
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

      const data = await response.json();

      const feature = data.features?.[0];

      if (!feature) {
        return NextResponse.json({ result: null });
      }

      return NextResponse.json({
        result: {
          display_name: buildDisplayName(feature.properties),
          address: feature.properties || {},
        },
      });
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
