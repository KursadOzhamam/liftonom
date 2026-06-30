"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { MapPin, MapPinOff } from "lucide-react";

type Row = {
  id: number; name: string; surname: string | null; phone: string | null; role: string;
  last_lat: number | null; last_lng: number | null; location_updated_at: string | null;
};

const ROLE: Record<string, string> = { manager: "Yönetici", technician: "Teknisyen", accounting: "Muhasebe", office: "Ofis", viewer: "Görüntüleyici" };

export default function StaffLocationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Row[]>("/users/locations").then(setRows).finally(() => setLoading(false));
  }, []);

  const withLoc = rows.filter((r) => r.last_lat != null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Personel Konum Takibi</h1>
      <p className="mt-1 text-sm text-muted">{withLoc.length} / {rows.length} personelin son konumu mevcut.</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Personel</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Son Güncelleme</th>
              <th className="px-4 py-3 font-medium text-right">Konum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Personel yok.</td></tr>
            ) : rows.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-medium text-ink">{[u.name, u.surname].filter(Boolean).join(" ")}</td>
                <td className="px-4 py-3 text-ink-soft">{ROLE[u.role] ?? u.role}</td>
                <td className="px-4 py-3 text-ink-soft">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted">{u.location_updated_at ? dateTR(u.location_updated_at) : "—"}</td>
                <td className="px-4 py-3 text-right">
                  {u.last_lat != null ? (
                    <a href={`https://www.google.com/maps?q=${u.last_lat},${u.last_lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                      <MapPin size={13} /> Haritada Gör
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted"><MapPinOff size={13} /> Konum yok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">Konumlar saha personelinin mobil uygulamasından <code className="rounded bg-surface px-1">POST /auth/location</code> ile güncellenir.</p>
    </div>
  );
}
