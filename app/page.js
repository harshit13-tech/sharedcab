 "use client";

import { useMemo, useState } from "react";

const demoRides = [
  { id: 1, from: "Electronic City", to: "Koramangala", time: "8:30 AM", fare: 1200, seats: 2, routeStart: 0, routeEnd: 20 },
  { id: 2, from: "Whitefield", to: "MG Road", time: "9:00 AM", fare: 900, seats: 1, routeStart: 0, routeEnd: 15 },
  { id: 3, from: "HSR Layout", to: "Airport", time: "7:15 AM", fare: 1700, seats: 2, routeStart: 5, routeEnd: 30 }
];

function estimateShare(totalFare, totalKm, riderKm, riders = 2) {
  if (!totalFare || !totalKm || !riderKm) return 0;
  // MVP model: allocate 70% by distance and 30% equally among riders.
  // This is deliberately transparent and will be replaced by a production
  // route-segment engine after map/route data is connected.
  const distancePart = totalFare * 0.70 * (riderKm / totalKm);
  const basePart = totalFare * 0.30 / riders;
  return Math.max(0, Math.round(distancePart + basePart));
}

export default function Home() {
  const [tab, setTab] = useState("find");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [time, setTime] = useState("08:30");
  const [fare, setFare] = useState(1200);
  const [created, setCreated] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  const matches = useMemo(() => {
    const q = `${pickup} ${destination}`.toLowerCase();
    if (!q.trim()) return demoRides;
    return demoRides.filter(r =>
      `${r.from} ${r.to}`.toLowerCase().includes(pickup.toLowerCase()) ||
      `${r.from} ${r.to}`.toLowerCase().includes(destination.toLowerCase())
    );
  }, [pickup, destination]);

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand"><span className="logo">↗</span> SharedRide</div>
        <span className="city">Bengaluru</span>
      </nav>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">BENGALURU • COMMUNITY RIDE SHARING</p>
          <h1>Going somewhere?<br /><span>Find people going your way.</span></h1>
          <p className="sub">Match with people travelling along your route, form a shared ride, and split the estimated fare fairly.</p>
        </div>

        <div className="rideBox">
          <div className="tabs">
            <button className={tab==="find" ? "active":""} onClick={()=>setTab("find")}>Find a ride</button>
            <button className={tab==="create" ? "active":""} onClick={()=>setTab("create")}>Create a ride</button>
          </div>

          {tab === "find" ? (
            <div className="form">
              <label>Pickup<input value={pickup} onChange={e=>setPickup(e.target.value)} placeholder="e.g. Electronic City" /></label>
              <label>Destination<input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="e.g. Koramangala" /></label>
              <label>Departure<select value={time} onChange={e=>setTime(e.target.value)}>
                <option value="08:30">8:30 AM</option><option value="09:00">9:00 AM</option><option value="18:30">6:30 PM</option>
              </select></label>
              <button className="primary" onClick={()=>document.getElementById("matches").scrollIntoView({behavior:"smooth"})}>Find matching rides →</button>
            </div>
          ) : (
            <div className="form">
              <label>Pickup<input value={pickup} onChange={e=>setPickup(e.target.value)} placeholder="Where are you starting?" /></label>
              <label>Destination<input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Where are you going?" /></label>
              <div className="two">
                <label>Departure<input type="time" value={time} onChange={e=>setTime(e.target.value)} /></label>
                <label>Estimated cab fare<input type="number" min="0" value={fare} onChange={e=>setFare(Number(e.target.value)||0)} /></label>
              </div>
              <button className="primary" onClick={()=>setCreated(true)}>Create ride →</button>
              {created && <div className="success">Ride created for {pickup || "your route"} → {destination || "your destination"}. In the production version, matching users will see it automatically.</div>}
            </div>
          )}
        </div>
      </section>

      <section className="section" id="matches">
        <div className="sectionHead">
          <div><p className="eyebrow">LIVE MVP DEMO</p><h2>People going your way</h2></div>
          <span className="count">{matches.length} matches</span>
        </div>
        <div className="cards">
          {matches.map(r => <article className="rideCard" key={r.id}>
            <div className="route">
              <div><b>{r.from}</b><small>Pickup</small></div>
              <div className="line"><i></i><span>{r.routeEnd-r.routeStart} km</span></div>
              <div><b>{r.to}</b><small>Destination</small></div>
            </div>
            <div className="meta"><span>🕐 {r.time}</span><span>👥 {r.seats} seats</span><span>₹{r.fare.toLocaleString("en-IN")} est.</span></div>
            <button className="secondary" onClick={()=>setSelectedRide(r)}>View fare split</button>
          </article>)}
        </div>
      </section>

      <section className="calculator">
        <div>
          <p className="eyebrow">FAIR FARE</p>
          <h2>Pay for the part of the journey you use.</h2>
          <p className="sub">The MVP uses a transparent distance + base-cost formula. Once maps are connected, the production engine will calculate actual route segments.</p>
        </div>
        <div className="calcCard">
          <label>Total cab fare<input id="tf" type="number" defaultValue="1700" /></label>
          <label>Total route distance (km)<input id="tk" type="number" defaultValue="20" /></label>
          <label>Your route distance (km)<input id="rk" type="number" defaultValue="10" /></label>
          <button className="primary" onClick={()=>{
            const total=Number(document.getElementById("tf").value)||0;
            const km=Number(document.getElementById("tk").value)||0;
            const mine=Math.min(Number(document.getElementById("rk").value)||0,km);
            const out=estimateShare(total,km,mine,2);
            document.getElementById("calcOut").textContent=`₹${out.toLocaleString("en-IN")}`;
          }}>Calculate</button>
          <div className="bigResult"><small>Your estimated share</small><strong id="calcOut">₹595</strong></div>
        </div>
      </section>

      {selectedRide && <div className="modalBack" onClick={()=>setSelectedRide(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <button className="close" onClick={()=>setSelectedRide(null)}>×</button>
          <p className="eyebrow">FARE PREVIEW</p>
          <h2>{selectedRide.from} → {selectedRide.to}</h2>
          <p className="sub">Estimated cab fare: ₹{selectedRide.fare.toLocaleString("en-IN")}</p>
          <div className="split"><span>Existing rider</span><b>₹{estimateShare(selectedRide.fare, selectedRide.routeEnd-selectedRide.routeStart, selectedRide.routeEnd-selectedRide.routeStart, 2)}</b></div>
          <div className="split"><span>Joining rider</span><b>₹{estimateShare(selectedRide.fare, selectedRide.routeEnd-selectedRide.routeStart, 10, 2)}</b></div>
          <p className="note">Final amounts are estimates. Users arrange the actual cab booking themselves in this MVP.</p>
        </div>
      </div>}

      <footer>SharedRide Bengaluru • MVP • No cab booking or payment is processed by this prototype.</footer>
    </main>
  );
}
