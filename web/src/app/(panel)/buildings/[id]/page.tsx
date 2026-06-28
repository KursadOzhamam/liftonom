"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

type Building = {
  id: number; name: string; address: string | null; district: string | null; city: string | null;
  floor_count: number | null; manager_name: string | null; manager_phone: string | null;
  customer?: { name: string } | null;
};
type Elevator = { id: number; name: string | null; brand: string | null; status: string };

const STATUS: Record<string, string> = { active: "Aktif", passive: "Pasif", faulty: "Arızalı" };
const TABS = ["genel", "asansorler"] as const;
const TAB_LABEL: Record<string, string> = { genel: "Genel Bilgiler", asansorler: "Asansörler" };

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>("genel");
  const [b, setB] = useState<Building | null>(null);
  const [elevators, setElevators] = useState<Elevator[]>([]);

  useEffect(() => { api<Building>(`/buildings/${id}`).then(setB); }, [id]);

  const loadTab = useCallback(() => {
    if (tab === "asansorler") api<{ data: Elevator[] }>(`/elevators?building_id=${id}`).then((r) => setElevators(r.data));
  }, [tab, id]);
  useEffect(() => { loadTab(); }, [loadTab]);

  if (!b) return <div className="text-muted">Yükleniyor…</div>;

  return (
    <div>
      <Link href="/buildings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Binalar
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">{b.name}</h1>
      <span className="text-sm text-muted">{b.customer?.name ?? "—"}</span>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted hover:text-ink"}`}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "genel" && (
          <div className="grid max-w-2xl grid-cols-2 gap-4 rounded-xl border border-line bg-white p-5 text-sm">
            <Info label="Şehir" value={b.city} />
            <Info label="İlçe" value={b.district} />
            <Info label="Kat Sayısı" value={b.floor_count != null ? String(b.floor_count) : null} />
            <Info label="Yönetici" value={b.manager_name} />
            <Info label="Yönetici Telefon" value={b.manager_phone} />
            <Info label="Adres" value={b.address} />
          </div>
        )}

        {tab === "asansorler" && (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Asansör</th><th className="px-4 py-3 font-medium">Marka</th>
                <th className="px-4 py-3 font-medium">Durum</th></tr></thead>
              <tbody>
                {elevators.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">Asansör yok.</td></tr>
                ) : elevators.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <a href={`/elevators/${e.id}`} className="text-primary hover:underline">{e.name ?? `#${e.id}`}</a>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.brand ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{STATUS[e.status] ?? e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-ink">{value || "—"}</div>
    </div>
  );
}
