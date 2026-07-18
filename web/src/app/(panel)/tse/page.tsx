"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { Search } from "lucide-react";

type Elevator = {
  id: number; name: string | null; status: string; tse_end_date: string | null;
  tse_label: "green" | "yellow" | "red" | "gray"; tse_label_color: string | null;
  building?: { name: string } | null;
};
type Report = {
  summary: { total: number; green: number; yellow: number; red: number; gray: number };
  items: { data: Elevator[] };
};

const VALIDITY: Record<string, { bg: string; text: string; label: string }> = {
  green:  { bg: "#DCFCE7", text: "#16A34A", label: "Geçerli" },
  yellow: { bg: "#FEF3C7", text: "#D97706", label: "Yaklaşıyor" },
  red:    { bg: "#FEE2E2", text: "#DC2626", label: "Süresi Dolmuş" },
  gray:   { bg: "#F3F4F6", text: "#6B7280", label: "Belge Yok" },
};
const LABEL: Record<string, { bg: string; text: string; label: string }> = {
  green:  { bg: "#DCFCE7", text: "#16A34A", label: "Yeşil" },
  blue:   { bg: "#DBEAFE", text: "#2563EB", label: "Mavi" },
  yellow: { bg: "#FEF3C7", text: "#D97706", label: "Sarı" },
  red:    { bg: "#FEE2E2", text: "#DC2626", label: "Kırmızı" },
};
const STATUS: Record<string, string> = { active: "Aktif", maintenance: "Bakımda", passive: "Pasif", faulty: "Arızalı" };

export default function TsePage() {
  const [rep, setRep] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState("upcoming");
  const [sort, setSort] = useState("near");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const h = setTimeout(() => {
      setLoading(true);
      api<Report>(`/elevators/tse-report?list=${list}&sort=${sort}&search=${encodeURIComponent(search)}`)
        .then(setRep).catch(() => {}).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(h);
  }, [list, sort, search]);

  const s = rep?.summary;
  const LISTS: [string, string, number | undefined][] = [
    ["upcoming", "Yaklaşan", s?.yellow],
    ["expired", "Süresi Dolmuş", s?.red],
    ["missing", "Belge Yok", s?.gray],
    ["all", "Tümü", s?.total],
  ];
  const listLabel = LISTS.find((l) => l[0] === list)?.[1] ?? "";
  const listCount = LISTS.find((l) => l[0] === list)?.[2];
  const dirty = list !== "upcoming" || sort !== "near" || search !== "";
  const rows = rep?.items.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">TSE Muayene Takibi</h1>
      <p className="mt-1 text-sm text-muted">
        Periyodik (TSE) muayene vadesi yaklaşan ve geçen asansörler. Vade yaklaşınca (30/7/3/1 gün kala) ve dolduğunda panelde otomatik bildirim oluşturulur.
      </p>

      <div className="mt-5 rounded-2xl border border-line bg-card p-5 shadow-card">
        {/* Arama */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Asansör, kayıt no, bina…" className="input pl-9" />
        </div>

        {/* Filtreler */}
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Liste</span>
            <select className="input w-56" value={list} onChange={(e) => setList(e.target.value)}>
              {LISTS.map(([v, l, c]) => <option key={v} value={v}>{l}{c != null ? ` (${c})` : ""}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Sırala</span>
            <select className="input w-56" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="near">Muayene tarihi (yakın)</option>
              <option value="far">Muayene tarihi (uzak)</option>
            </select>
          </label>
          {dirty && (
            <button onClick={() => { setList("upcoming"); setSort("near"); setSearch(""); }}
              className="ml-auto text-sm font-medium text-primary hover:underline">Temizle</button>
          )}
        </div>

        {/* Aktif filtre çipleri */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3 text-sm">
          <span className="text-muted">Aktif:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
            Liste: {listLabel}{listCount != null ? ` (${listCount})` : ""}
          </span>
          {search && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft">
              Arama: “{search}”
              <button onClick={() => setSearch("")} className="text-muted hover:text-danger">×</button>
            </span>
          )}
        </div>

        {/* Tablo */}
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Asansör</th>
                <th className="px-4 py-3 font-medium">Bina</th>
                <th className="px-4 py-3 font-medium">Sonraki TSE</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">TSE Etiket</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">Yükleniyor…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">Seçilen filtrelere uyan kayıt bulunamadı.</td></tr>
              ) : rows.map((e) => {
                const v = VALIDITY[e.tse_label];
                const lbl = e.tse_label_color ? LABEL[e.tse_label_color] : null;
                return (
                  <tr key={e.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium">
                      <a href={`/elevators/${e.id}`} className="text-primary hover:underline">{e.name ?? `#${e.id}`}</a>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.building?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: v.text }} />
                        <span className="text-ink-soft">{dateTR(e.tse_end_date)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{STATUS[e.status] ?? e.status}</td>
                    <td className="px-4 py-3">
                      {lbl ? (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: lbl.bg, color: lbl.text }}>{lbl.label}</span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: v.bg, color: v.text }}>{v.label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
