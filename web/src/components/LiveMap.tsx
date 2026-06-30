"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { X, Navigation, MapPin, Clock } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { L?: any }
}

type Fault = {
  id: number;
  elevator?: { name: string } | null;
  status: string;
  technician_lat?: number | null;
  technician_lng?: number | null;
  location_updated_at?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  destination_address?: string | null;
  destination_name?: string | null;
};

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

function pin(L: any, color: string, emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff"><span style="transform:rotate(45deg);font-size:14px">${emoji}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  });
}

export default function LiveMap({ faultId, onClose }: { faultId: number; onClose: () => void }) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const techMarker = useRef<any>(null);
  const destMarker = useRef<any>(null);
  const routeLayer = useRef<any>(null);
  const [fault, setFault] = useState<Fault | null>(null);
  const [route, setRoute] = useState<{ km: number; min: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !mapDiv.current) return;

      async function refresh() {
        const f = await api<Fault>(`/fault-reports/${faultId}`);
        if (cancelled) return;
        setFault(f);
        const tLat = f.technician_lat, tLng = f.technician_lng;
        const dLat = f.destination_lat, dLng = f.destination_lng;

        if (!map.current) {
          const center = tLat != null ? [tLat, tLng] : dLat != null ? [dLat, dLng] : [41.01, 28.97];
          map.current = L.map(mapDiv.current).setView(center, 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap", maxZoom: 19,
          }).addTo(map.current);
          // Modal içinde container boyutu geç hesaplanır → düzelt
          setTimeout(() => map.current && map.current.invalidateSize(), 150);
        }
        map.current.invalidateSize();

        // Hedef (arıza yeri)
        if (dLat != null && dLng != null && !destMarker.current) {
          destMarker.current = L.marker([dLat, dLng], { icon: pin(L, "#DC2626", "📍") })
            .addTo(map.current).bindPopup("📍 Arıza Yeri");
        }
        // Teknisyen
        if (tLat != null && tLng != null) {
          if (!techMarker.current) {
            techMarker.current = L.marker([tLat, tLng], { icon: pin(L, "#2563EB", "🔧") })
              .addTo(map.current).bindPopup("🔧 Teknisyen");
          } else {
            techMarker.current.setLatLng([tLat, tLng]);
          }
        }

        // Rota + mesafe + süre (OSRM, ücretsiz)
        if (tLat != null && tLng != null && dLat != null && dLng != null) {
          try {
            const url = `https://router.project-osrm.org/route/v1/driving/${tLng},${tLat};${dLng},${dLat}?overview=full&geometries=geojson`;
            const r = await fetch(url);
            const j = await r.json();
            const rt = j.routes?.[0];
            if (rt && !cancelled) {
              setRoute({ km: rt.distance / 1000, min: rt.duration / 60 });
              if (routeLayer.current) map.current.removeLayer(routeLayer.current);
              routeLayer.current = L.geoJSON(rt.geometry, { style: { color: "#2563EB", weight: 5, opacity: 0.7 } }).addTo(map.current);
              const km = rt.distance / 1000;
              const zoom = km < 1 ? 15 : km < 2 ? 14 : km < 5 ? 13 : km < 10 ? 12 : km < 25 ? 11 : 10;
              const mid: [number, number] = [(tLat + dLat) / 2, (tLng + dLng) / 2];
              map.current.invalidateSize();
              map.current.setView(mid, zoom);
            }
          } catch { /* OSRM erişilemezse rota çizilmez */ }
        } else if (tLat != null) {
          map.current.panTo([tLat, tLng]);
        }
      }

      await new Promise((r) => setTimeout(r, 250)); // modal yerleşsin, sonra harita kurulsun
      if (cancelled) return;
      await refresh();
      setTimeout(() => map.current && map.current.invalidateSize(), 500);
      timer = setInterval(refresh, 15000);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [faultId]);

  const hasLoc = fault?.technician_lat != null && fault?.technician_lng != null;

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="font-semibold text-ink">Canlı Takip · {fault?.elevator?.name ?? `Arıza #${faultId}`}</h2>
            <p className="text-xs text-muted">
              {fault?.destination_address ?? fault?.destination_name ?? "Arıza yeri"}
              {hasLoc && fault?.location_updated_at
                ? ` · son sinyal ${new Date(fault.location_updated_at).toLocaleTimeString("tr-TR")}`
                : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>

        {route && (
          <div className="flex items-center gap-6 border-b border-line bg-surface px-5 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-ink"><Navigation size={15} className="text-primary" /> {route.km.toFixed(1)} km</span>
            <span className="flex items-center gap-1.5 font-medium text-ink"><Clock size={15} className="text-primary" /> ~{Math.max(1, Math.round(route.min))} dk</span>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted"><MapPin size={13} className="text-danger" /> Arıza yeri</span>
          </div>
        )}

        <div className="relative">
          <div ref={mapDiv} className="h-[440px] w-full bg-surface" />
          {!hasLoc && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
              Konum bekleniyor… (teknisyen “Yola Çık” dediğinde görünür)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
