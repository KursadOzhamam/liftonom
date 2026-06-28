"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search } from "lucide-react";

type Elevator = {
  id: number;
  name: string | null;
  brand: string | null;
  serial_number: string | null;
  status: string;
  tse_end_date: string | null;
  tse_label: "green" | "yellow" | "red" | "gray";
  building?: { name: string } | null;
};
type Paginated = { data: Elevator[]; meta: { current_page: number; last_page: number; total: number } };

const TSE: Record<string, { bg: string; text: string; label: string }> = {
  green:  { bg: "#DCFCE7", text: "#16A34A", label: "Geçerli" },
  yellow: { bg: "#FEF3C7", text: "#D97706", label: "Yaklaşıyor" },
  red:    { bg: "#FEE2E2", text: "#DC2626", label: "Süresi Doldu" },
  gray:   { bg: "#F3F4F6", text: "#6B7280", label: "Belge Yok" },
};
const STATUS: Record<string, string> = { active: "Aktif", passive: "Pasif", faulty: "Arızalı" };

export default function ElevatorsPage() {
  const [rows, setRows] = useState<Elevator[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/elevators?search=${encodeURIComponent(search)}&page=${page}`);
      setRows(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Asansörler</h1>
      <p className="mt-1 text-sm text-muted">{meta?.total ?? 0} asansör</p>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Ad, seri no, marka…" className="input pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Bina</th>
              <th className="px-4 py-3 font-medium">Marka</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">TSE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((e) => {
                const tse = TSE[e.tse_label];
                return (
                  <tr key={e.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{e.name ?? `#${e.id}`}</td>
                    <td className="px-4 py-3 text-ink-soft">{e.building?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{e.brand ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{STATUS[e.status] ?? e.status}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: tse.bg, color: tse.text }}>
                        {tse.label}{e.tse_end_date ? ` · ${new Date(e.tse_end_date).toLocaleDateString("tr-TR")}` : ""}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Önceki</button>
          <span className="text-muted">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Sonraki</button>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        TSE renk kodu: <b style={{ color: "#16A34A" }}>Yeşil</b> &gt;30 gün ·
        <b style={{ color: "#D97706" }}> Sarı</b> ≤30 gün ·
        <b style={{ color: "#DC2626" }}> Kırmızı</b> geçmiş ·
        <b style={{ color: "#6B7280" }}> Gri</b> belge yok
      </p>
    </div>
  );
}
