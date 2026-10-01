"use client";

import { useEffect, useRef, useState } from "react";
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

const pickupIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:18px;
      height:18px;
      background:#16a34a;
      border:4px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:18px;
      height:18px;
      background:#dc2626;
      border:4px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({
  activeField,
  setPickup,
  setDestination,
  reverseGeocode,
}) {
  useMapEvents({
    click(e) {
      const position = [e.latlng.lat, e.latlng.lng];

      if (activeField === "pickup") {
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

function MapViewport({ pickup, destination, focusPoint }) {
  const map = useMap();

  useEffect(() => {
    if (focusPoint) {
      map.setView(focusPoint, 15, {
        animate: true,
      });
      return;
    }

    if (pickup && destination) {
      map.fitBounds([pickup, destination], {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
      });

      return;
    }

    if (pickup) {
      map.setView(pickup, 15, {
        animate: true,
      });

      return;
    }

    if (destination) {
      map.setView(destination, 15, {
        animate: true,
      });
    }
  }, [pickup, destination, focusPoint, map]);

  return null;
}

export default function RideMap({
  pickup,
  destination,
  setPickup,
  setDestination,
  pickupName,
  destinationName,
  setPickupName,
  setDestinationName,
}) {
  const bengaluru = [12.9716, 77.5946];

  const [activeField, setActiveField] = useState("pickup");

  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  const [pickupResults, setPickupResults] = useState([]);
  const [destinationResults, setDestinationResults] = useState([]);

  const [searching, setSearching] = useState(false);

  const [focusPoint, setFocusPoint] = useState(null);

  const searchTimer = useRef(null);
  const abortController = useRef(null);

  async function searchLocation(query, field) {
    const value = query.trim();

    if (value.length < 2) {
      if (field === "pickup") {
        setPickupResults([]);
      } else {
        setDestinationResults([]);
      }

      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }

    const controller = new AbortController();
    abortController.current = controller;

    setSearching(true);

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(value)}`,
        {
          signal: controller.signal,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Search failed");
      }

      if (field === "pickup") {
        setPickupResults(data.results || []);
      } else {
        setDestinationResults(data.results || []);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Location search failed:", error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  }

  function handleLocationChange(field, value) {
    setActiveField(field);

    if (field === "pickup") {
      setPickupName(value);
      setPickupResults([]);
    } else {
      setDestinationName(value);
      setDestinationResults([]);
    }

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      searchLocation(value, field);
    }, 350);
  }

  function selectSearchResult(result, field) {
    const position = [
      Number(result.lat),
      Number(result.lon),
    ];

    setFocusPoint(position);

    if (field === "pickup") {
      setPickup(position);
      setPickupName(result.display_name);
      setPickupResults([]);
    } else {
      setDestination(position);
      setDestinationName(result.display_name);
      setDestinationResults([]);
    }
  }

  async function reverseGeocode(position, field) {
    try {
      const response = await fetch(
        `/api/geocode?lat=${position[0]}&lon=${position[1]}`
      );

      const data = await response.json();

      if (!data.result) {
        return;
      }

      const name = data.result.display_name;

      if (field === "pickup") {
        setPickupName(name);
      } else {
        setDestinationName(name);
      }

      setFocusPoint(position);
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
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

        setFocusPoint(location);

        if (activeField === "pickup") {
          setPickup(location);
          reverseGeocode(location, "pickup");
        } else {
          setDestination(location);
          reverseGeocode(location, "destination");
        }
      },
      () => {
        alert(
          "Unable to get your current location. Please allow location access."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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

    let cancelled = false;

    async function calculateRoute() {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${pickup[1]},${pickup[0]};${destination[1]},${destination[0]}` +
          `?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!data.routes?.length) {
          setRoute([]);
          return;
        }

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
        if (!cancelled) {
          console.error("Route calculation failed:", error);
        }
      }
    }

    calculateRoute();

    return () => {
      cancelled = true;
    };
  }, [pickup, destination]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }

      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const activeResults =
    activeField === "pickup"
      ? pickupResults
      : destinationResults;

  return (
    <div className="ride-map-wrapper">

      {/* LOCATION SEARCH CARD */}

      <div className="location-picker">

        {/* PICKUP */}

        <div
          className={`location-field ${
            activeField === "pickup" ? "active" : ""
          }`}
        >
          <div className="location-dot pickup-dot"></div>

          <div className="location-input-area">
            <label>Pickup</label>

            <input
              type="text"
              value={pickupName}
              onFocus={() => setActiveField("pickup")}
              onChange={(e) =>
                handleLocationChange(
                  "pickup",
                  e.target.value
                )
              }
              placeholder="Search pickup location"
              autoComplete="off"
              required
            />
          </div>

          {activeField === "pickup" &&
            pickupResults.length > 0 && (
              <div className="location-suggestions">
                {pickupResults.map((result) => (
                  <button
                    type="button"
                    key={result.id}
                    onClick={() =>
                      selectSearchResult(
                        result,
                        "pickup"
                      )
                    }
                  >
                    <span className="suggestion-icon">
                      📍
                    </span>

                    <span>
                      {result.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>

        {/* DESTINATION */}

        <div
          className={`location-field ${
            activeField === "destination"
              ? "active"
              : ""
          }`}
        >
          <div className="location-dot destination-dot"></div>

          <div className="location-input-area">
            <label>Destination</label>

            <input
              type="text"
              value={destinationName}
              onFocus={() =>
                setActiveField("destination")
              }
              onChange={(e) =>
                handleLocationChange(
                  "destination",
                  e.target.value
                )
              }
              placeholder="Where are you going?"
              autoComplete="off"
              required
            />
          </div>

          {activeField === "destination" &&
            destinationResults.length > 0 && (
              <div className="location-suggestions">
                {destinationResults.map((result) => (
                  <button
                    type="button"
                    key={result.id}
                    onClick={() =>
                      selectSearchResult(
                        result,
                        "destination"
                      )
                    }
                  >
                    <span className="suggestion-icon">
                      📍
                    </span>

                    <span>
                      {result.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>

        {/* CURRENT LOCATION */}

        <button
          type="button"
          className="current-location-button"
          onClick={getCurrentLocation}
        >
          📍 Use my current location
        </button>

        {searching && (
          <div className="search-status">
            Searching locations...
          </div>
        )}
      </div>

      {/* MAP */}

      <div className="map-container-wrapper">

        <MapContainer
          center={bengaluru}
          zoom={12}
          scrollWheelZoom
          style={{
            width: "100%",
            height: "500px",
            borderRadius: "18px",
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler
            activeField={activeField}
            setPickup={setPickup}
            setDestination={setDestination}
            reverseGeocode={reverseGeocode}
          />

          <MapViewport
            pickup={pickup}
            destination={destination}
            focusPoint={focusPoint}
          />

          {/* PICKUP MARKER */}

          {pickup && (
            <Marker
              position={pickup}
              icon={pickupIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const position =
                    event.target.getLatLng();

                  const coordinates = [
                    position.lat,
                    position.lng,
                  ];

                  setPickup(coordinates);

                  reverseGeocode(
                    coordinates,
                    "pickup"
                  );
                },
              }}
            >
              <Popup>
                <strong>Pickup</strong>
                <br />
                {pickupName || "Pickup location"}
              </Popup>
            </Marker>
          )}

          {/* DESTINATION MARKER */}

          {destination && (
            <Marker
              position={destination}
              icon={destinationIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const position =
                    event.target.getLatLng();

                  const coordinates = [
                    position.lat,
                    position.lng,
                  ];

                  setDestination(coordinates);

                  reverseGeocode(
                    coordinates,
                    "destination"
                  );
                },
              }}
            >
              <Popup>
                <strong>Destination</strong>
                <br />
                {destinationName ||
                  "Destination"}
              </Popup>
            </Marker>
          )}

          {/* ROUTE */}

          {route.length > 0 && (
            <Polyline
              positions={route}
              pathOptions={{
                weight: 5,
              }}
            />
          )}
        </MapContainer>

      </div>

      {/* ROUTE INFORMATION */}

      {pickup && destination && (
        <div className="route-info">

          <div>
            <span>Distance</span>
            <strong>{distance} km</strong>
          </div>

          <div>
            <span>Estimated time</span>
            <strong>{duration} min</strong>
          </div>

        </div>
      )}

      <div className="map-hint">
        Select a location above or drag the markers
        on the map to adjust your pickup and destination.
      </div>

    </div>
  );
}
