"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

const RideMap = dynamic(() => import("./components/RideMap"), {
  ssr: false,
});
function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function estimateShare(totalFare, totalKm, riderKm, riders = 2) {
  if (!totalFare || !totalKm || !riderKm) return 0;
  const distancePart = totalFare * 0.7 * (riderKm / totalKm);
  const basePart = totalFare * 0.3 / riders;
  return Math.max(0, Math.round(distancePart + basePart));
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("find");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("08:30");
  const [fare, setFare] = useState(1200);
  const [seats, setSeats] = useState(2);
  const [rides, setRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    loadRides();
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function loadRides(filters = {}) {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.pickup ?? pickup) qs.set("pickup", filters.pickup ?? pickup);
    if (filters.destination ?? destination) qs.set("destination", filters.destination ?? destination);
    const response = await fetch(`/api/rides?${qs.toString()}`, { cache: "no-store" });
    const data = await response.json();
    setRides(data.rides || []);
    if (data.error) setNotice(data.error);
    setLoading(false);
  }

  async function createRide(e) {
    e.preventDefault();
    setNotice("");
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setBusy(true);
    const departureTime = new Date(`${date}T${time}`).toISOString();
    const response = await fetch("/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickup, destination, departureTime, estimatedFare: fare, seatsTotal: seats }),
    });
    const data = await response.json();
    if (!response.ok) setNotice(data.error || "Could not create ride.");
    else {
      setNotice("Ride created. Other users can now find it and join.");
      setTab("find");
      await loadRides();
    }
    setBusy(false);
  }

  async function joinRide(rideId) {
    setNotice("");
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setBusy(true);
    const response = await fetch("/api/rides/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideId }),
    });
    const data = await response.json();
    setNotice(data.error || data.message || "Done.");
    if (response.ok) await loadRides();
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <main className="page">
      <nav className="nav">
        <a href="/" className="brand"><span className="logo">↗</span> SharedRide</a>
        <div className="navRight">
          <span className="city">Bengaluru</span>
          {user ? <button className="navButton" onClick={signOut}>Sign out</button> : <a className="navButton" href="/auth">Sign in</a>}
        </div>
      </nav>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">BENGALURU • COMMUNITY RIDE SHARING</p>
          <h1>Going somewhere?<br /><span>Find people going your way.</span></h1>
          <p className="sub">Create a shared ride, discover people travelling the same direction, and coordinate the cab together.</p>
          {user && <p className="signed">Signed in as {user.email}</p>}
        </div>

        <div className="rideBox">
          <div className="tabs">
            <button className={tab === "find" ? "active" : ""} onClick={() => setTab("find")}>Find a ride</button>
            <button className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}>Create a ride</button>
          </div>

          {tab === "find" ? (
            <div className="form">
              <label>Pickup<input value={pickup} onChange={e => setPickup(e.target.value)} placeholder="e.g. Electronic City" /></label>
              <label>Destination<input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Koramangala" /></label>
              <div className="two">
                <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
                <label>Time<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
              </div>
              <button className="primary" onClick={() => loadRides()}>Find matching rides →</button>
            </div>
          ) : (
            <form className="form" onSubmit={createRide}>
            <label>
  Pickup
  <input
    required
    value={pickup}
    onChange={e => setPickup(e.target.value)}
    placeholder="Where are you starting?"
  />
</label>

<label>
  Destination
  <input
    required
    value={destination}
    onChange={e => setDestination(e.target.value)}
    placeholder="Where are you going?"
  />
</label>

<div className="map-section">
  <h3>Choose your locations on the map</h3>

  <RideMap
    pickup={pickupCoords}
    destination={destinationCoords}
    setPickup={setPickupCoords}
    setDestination={setDestinationCoords}
  />
</div>
              <div className="two"><label>Date<input type="date" required value={date} onChange={e => setDate(e.target.value)} /></label><label>Time<input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label></div>
              <div className="two"><label>Estimated cab fare<input type="number" min="1" required value={fare} onChange={e => setFare(Number(e.target.value) || 0)} /></label><label>Total seats<input type="number" min="1" max="6" value={seats} onChange={e => setSeats(Number(e.target.value) || 1)} /></label></div>
              <button className="primary" disabled={busy}>{busy ? "Creating…" : "Create ride →"}</button>
            </form>
          )}
        </div>
      </section>

      {notice && <div className="notice">{notice}</div>}

      <section className="section" id="matches">
        <div className="sectionHead"><div><p className="eyebrow">LIVE RIDES</p><h2>People going your way</h2></div><span className="count">{rides.length} open</span></div>
        {loading ? <div className="empty">Loading rides…</div> : rides.length === 0 ? <div className="empty">No matching rides yet. Create the first one for this route.</div> : <div className="cards">
          {rides.map(r => <article className="rideCard" key={r.id}>
            <div className="route"><div><b>{r.pickup}</b><small>Pickup</small></div><div className="line"><i></i><span>shared</span></div><div><b>{r.destination}</b><small>Destination</small></div></div>
            <div className="meta"><span>🕐 {formatDateTime(r.departure_time)}</span><span>👥 {r.seats_available} seats left</span><span>{money(r.estimated_fare)} est.</span></div>
            <div className="cardActions"><button className="secondary" onClick={() => setSelectedRide(r)}>Fare preview</button><button className="primary small" disabled={busy || r.user_id === user?.id} onClick={() => joinRide(r.id)}>{r.user_id === user?.id ? "Your ride" : "Join ride"}</button></div>
          </article>)}
        </div>}
      </section>

      <section className="calculator">
        <div><p className="eyebrow">FAIR FARE</p><h2>Pay for the part of the journey you use.</h2><p className="sub">For now, the app shows an estimated split using a transparent distance + base-cost model. The map-based route engine comes next.</p></div>
        <div className="calcCard">
          <label>Total cab fare<input id="tf" type="number" defaultValue="1700" /></label>
          <label>Total route distance (km)<input id="tk" type="number" defaultValue="20" /></label>
          <label>Your route distance (km)<input id="rk" type="number" defaultValue="10" /></label>
          <button className="primary" onClick={() => { const total = Number(document.getElementById("tf").value) || 0; const km = Number(document.getElementById("tk").value) || 0; const mine = Math.min(Number(document.getElementById("rk").value) || 0, km); document.getElementById("calcOut").textContent = money(estimateShare(total, km, mine, 2)); }}>Calculate</button>
          <div className="bigResult"><small>Your estimated share</small><strong id="calcOut">₹595</strong></div>
        </div>
      </section>

      {selectedRide && <div className="modalBack" onClick={() => setSelectedRide(null)}><div className="modal" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setSelectedRide(null)}>×</button><p className="eyebrow">FARE PREVIEW</p><h2>{selectedRide.pickup} → {selectedRide.destination}</h2><p className="sub">Estimated cab fare: {money(selectedRide.estimated_fare)}</p><div className="split"><span>Full-route rider</span><b>{money(estimateShare(selectedRide.estimated_fare, 20, 20, 2))}</b></div><div className="split"><span>Joining rider (10 km estimate)</span><b>{money(estimateShare(selectedRide.estimated_fare, 20, 10, 2))}</b></div><p className="note">These are estimates until live route segments are connected to a maps provider.</p></div></div>}

      <footer>SharedRide Bengaluru • v0.2 • Matching and ride coordination are live; cab booking and payment remain outside the app.</footer>
    </main>
  );
}
