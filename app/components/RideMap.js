"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({
  mode,
  setPickup,
  setDestination,
  reverseGeocode,
}) {
  useMapEvents({
    click(e) {
      const position = [e.latlng.lat, e.latlng.lng];

      if (mode === "pickup") {
        setPickup(position);
        reverseGeocode(position, "pickup");
      } else {
        setDestination(position);
        reverseGeocode(position, "destination");
      }
    },
  });

  return null;
}

function MapCenter({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView(location, 15);
    }
  }, [location, map]);

  return null;
}

export default function RideMap({
  pickup,
  destination,
  setPickup,
  setDestination,
  setPickupName,
  setDestinationName,
}) {
  const [mode, setMode] = useState("pickup");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const bengaluru = [12.9716, 77.5946];

  async function reverseGeocode(position, type) {
    try {
      const response = await fetch(
        `/api/geocode?lat=${position[0]}&lon=${position[1]}`
      );

      const data = await response.json();

      if (!data.result) return;

      const address = data.result.address || {};

      const name =
        address.road ||
        address.neighbourhood ||
        address.suburb ||
        address.city_district ||
        address.city ||
        data.result.display_name;

      if (type === "pickup") {
        setPickupName(name);
      } else {
        setDestinationName(name);
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
  }

  async function searchLocation() {
    const query = searchText.trim();

    if (!query) return;

    setSearching(true);
    setResults([]);

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (!response.ok || !data.results?.length) {
        alert("Location not found. Try a more specific place name.");
        return;
      }

      setResults(data.results);
    } catch (error) {
      console.error("Location search failed:", error);
      alert("Could not search for this location.");
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(result) {
    const position = [
      Number(result.lat),
      Number(result.lon),
    ];

    if (mode === "pickup") {
      setPickup(position);
      setPickupName(result.display_name);
    } else {
      setDestination(position);
      setDestinationName(result.display_name);
    }

    setResults([]);
    setSearchText("");
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Your browser does not support location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setCurrentLocation(location);

        if (mode === "pickup") {
          setPickup(location);
          reverseGeocode(location, "pickup");
        } else {
          setDestination(location);
          reverseGeocode(location, "destination");
        }
      },
      () => {
        alert("Unable to get your current location.");
      }
    );
  }

  useEffect(() => {
    if (!pickup || !destination) {
      setRoute([]);
      setDistance(null);
      setDuration(null);
      return;
    }

    async function calculateRoute() {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${pickup[1]},${pickup[0]};${destination[1]},${destination[0]}` +
          `?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes?.length) return;

        const selectedRoute = data.routes[0];

        const coordinates =
          selectedRoute.geometry.coordinates.map(([lng, lat]) => [
            lat,
            lng,
          ]);

        setRoute(coordinates);
        setDistance(
          (selectedRoute.distance / 1000).toFixed(1)
        );
        setDuration(
          Math.round(selectedRoute.duration / 60)
        );
      } catch (error) {
        console.error("Route calculation failed:", error);
      }
    }

    calculateRoute();
  }, [pickup, destination]);

  return (
    <div className="ride-map-wrapper">

      <div className="map-search">
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchLocation();
            }
          }}
          placeholder={
            mode === "pickup"
              ? "Search pickup location..."
              : "Search destination..."
          }
        />

        <button
          type="button"
          onClick={searchLocation}
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((result) => (
            <button
              type="button"
              key={`${result.place_id}-${result.lat}-${result.lon}`}
              onClick={() => selectSearchResult(result)}
            >
              <strong>{result.display_name}</strong>
            </button>
          ))}
        </div>
      )}

      <div className="map-controls">
        <button
          type="button"
          onClick={getCurrentLocation}
        >
          📍 Use Current Location
        </button>

        <button
          type="button"
          className={mode === "pickup" ? "active" : ""}
          onClick={() => setMode("pickup")}
        >
          📍 Set Pickup
        </button>

        <button
          type="button"
          className={mode === "destination" ? "active" : ""}
          onClick={() => setMode("destination")}
        >
          🏁 Set Destination
        </button>
      </div>

      <MapContainer
        center={bengaluru}
        zoom={12}
        scrollWheelZoom
        style={{
          width: "100%",
          height: "500px",
          borderRadius: "16px",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          mode={mode}
          setPickup={setPickup}
          setDestination={setDestination}
          reverseGeocode={reverseGeocode}
        />

        <MapCenter location={currentLocation} />

        {pickup && (
          <Marker
            position={pickup}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const position = event.target.getLatLng();
                const coordinates = [
                  position.lat,
                  position.lng,
                ];

                setPickup(coordinates);
                reverseGeocode(coordinates, "pickup");
              },
            }}
          >
            <Popup>📍 Pickup Location</Popup>
          </Marker>
        )}

        {destination && (
          <Marker
            position={destination}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const position = event.target.getLatLng();
                const coordinates = [
                  position.lat,
                  position.lng,
                ];

                setDestination(coordinates);
                reverseGeocode(coordinates, "destination");
              },
            }}
          >
            <Popup>🏁 Destination</Popup>
          </Marker>
        )}

        {route.length > 0 && (
          <Polyline positions={route} />
        )}
      </MapContainer>

      {pickup && destination && (
        <div className="route-info">
          <div>
            <strong>Distance</strong>
            <span>{distance} km</span>
          </div>

          <div>
            <strong>Estimated Time</strong>
            <span>{duration} min</span>
          </div>
        </div>
      )}

      <p className="map-hint">
        Search for a location or click the map. You can drag
        either marker to adjust the exact location.
      </p>
    </div>
  );
}
