"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { L?: any }
}

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.setAttribute("data-leaflet", "1");
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve(window.L);
    document.head.appendChild(s);
  });
}

export default function LocationPicker({
  lat, lng, defaultQuery, onChange,
}: {
  lat: number | null;
  lng: number | null;
  defaultQuery?: string;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // onChange'i ref'te tut (effect'i tekrar kurmadan)
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      await new Promise((r) => setTimeout(r, 200));
      if (cancelled || !mapDiv.current || map.current) return;

      const start: [number, number] = lat != null && lng != null ? [lat, lng] : [41.0082, 28.9784];
      map.current = L.map(mapDiv.current).setView(start, lat != null ? 15 : 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map.current);
      map.current.invalidateSize();

      if (lat != null && lng != null) {
        marker.current = L.marker([lat, lng], { draggable: true }).addTo(map.current);
        marker.current.on("dragend", () => {
          const p = marker.current.getLatLng();
          cb.current(p.lat, p.lng);
        });
      }

      map.current.on("click", (e: any) => {
        const { lat: la, lng: ln } = e.latlng;
        place(L, la, ln);
        cb.current(la, ln);
      });

      setTimeout(() => map.current && map.current.invalidateSize(), 400);
    })();
    return () => { cancelled = true; if (map.current) { map.current.remove(); map.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function place(L: any, la: number, ln: number) {
    if (!marker.current) {
      marker.current = L.marker([la, ln], { draggable: true }).addTo(map.current);
      marker.current.on("dragend", () => {
        const p = marker.current.getLatLng();
        cb.current(p.lat, p.lng);
      });
    } else {
      marker.current.setLatLng([la, ln]);
    }
    map.current.setView([la, ln], 16);
  }

  async function geocode() {
    if (!query.trim()) return;
    setSearching(true); setNotFound(false);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const r = await fetch(url, { headers: { "Accept-Language": "tr" } });
      const j = await r.json();
      if (j[0]) {
        const la = parseFloat(j[0].lat), ln = parseFloat(j[0].lon);
        const L = window.L;
        place(L, la, ln);
        cb.current(la, ln);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Adres ara (örn. Levent, Beşiktaş İstanbul)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); geocode(); } }}
        />
        <button type="button" onClick={geocode} disabled={searching}
          className="flex items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium hover:bg-surface disabled:opacity-50">
          <Search size={15} /> {searching ? "…" : "Bul"}
        </button>
      </div>
      {notFound && <p className="mt-1 text-xs text-danger">Adres bulunamadı, haritadan tıklayarak seçebilirsiniz.</p>}
      <div ref={mapDiv} className="mt-2 h-56 w-full overflow-hidden rounded-lg border border-line bg-surface" />
      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        <MapPin size={12} className="text-danger" />
        {lat != null && lng != null
          ? `Seçilen konum: ${lat.toFixed(5)}, ${lng.toFixed(5)} — taşımak için işaretçiyi sürükleyin`
          : "Haritaya tıklayarak veya adres arayarak konum seçin"}
      </p>
    </div>
  );
}
