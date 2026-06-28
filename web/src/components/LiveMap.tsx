"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";

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

export default function LiveMap({ faultId, onClose }: { faultId: number; onClose: () => void }) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [fault, setFault] = useState<Fault | null>(null);

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
        const lat = f.technician_lat, lng = f.technician_lng;
        if (lat == null || lng == null) return;
        if (!map.current) {
          map.current = L.map(mapDiv.current).setView([lat, lng], 15);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap", maxZoom: 19,
          }).addTo(map.current);
          marker.current = L.marker([lat, lng]).addTo(map.current)
            .bindPopup("🔧 Teknisyen").openPopup();
        } else {
          marker.current.setLatLng([lat, lng]);
          map.current.panTo([lat, lng]);
        }
      }

      await refresh();
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
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="font-semibold text-ink">Canlı Konum · {fault?.elevator?.name ?? `Arıza #${faultId}`}</h2>
            <p className="text-xs text-muted">
              {hasLoc
                ? `Son güncelleme: ${fault?.location_updated_at ? new Date(fault.location_updated_at).toLocaleTimeString("tr-TR") : "—"}`
                : "Teknisyen henüz konum paylaşmadı."}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="relative">
          <div ref={mapDiv} className="h-[420px] w-full bg-surface" />
          {!hasLoc && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted">
              Konum bekleniyor… (teknisyen “Yola Çık” dediğinde görünür)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
