"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

type Item = { id: number; elevator_id: number; type: string | null; status: string; planned_date: string | null };

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-primary)", in_progress: "var(--color-warning)",
  completed: "var(--color-success)", cancelled: "var(--color-danger)",
};
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function MaintenanceCalendarPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const elevators = useOptions("/elevators");
  const elevName = (id: number) => elevators.find((e) => e.id === id)?.label ?? `#${id}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-01`;
      const endDate = new Date(cursor.y, cursor.m + 1, 0);
      const end = ymd(endDate);
      setItems(await api<Item[]>(`/maintenance/calendar?start=${start}&end=${end}`));
    } finally { setLoading(false); }
  }, [cursor]);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of items) {
      if (!it.planned_date) continue;
      const key = it.planned_date.slice(0, 10);
      (map[key] ??= []).push(it);
    }
    return map;
  }, [items]);

  // Ayın günleri (Pazartesi başlangıçlı grid)
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7; // Pazartesi=0
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(cursor.y, cursor.m, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const todayKey = ymd(new Date());

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bakım Takvimi</h1>
          <p className="mt-1 text-sm text-muted">{items.length} planlı bakım · {MONTHS[cursor.m]} {cursor.y}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/maintenance" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface">
            <List size={15} /> Liste
          </Link>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-card">
            <button onClick={() => shift(-1)} className="px-2 py-2 text-ink-soft hover:text-primary" aria-label="Önceki ay"><ChevronLeft size={16} /></button>
            <button onClick={() => setCursor(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })} className="px-2 py-1 text-xs text-muted hover:text-primary">Bugün</button>
            <button onClick={() => shift(1)} className="px-2 py-2 text-ink-soft hover:text-primary" aria-label="Sonraki ay"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-xs font-medium uppercase tracking-wide text-muted">
          {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = d ? ymd(d) : `e${i}`;
            const dayItems = d ? (byDay[key] ?? []) : [];
            const isToday = d && key === todayKey;
            return (
              <div key={key} className={`min-h-24 border-b border-r border-line p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${d ? "" : "bg-surface/50"}`}>
                {d && (
                  <>
                    <div className={`mb-1 text-xs ${isToday ? "grid h-5 w-5 place-items-center rounded-full bg-primary font-semibold text-white" : "text-muted"}`}>{d.getDate()}</div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((it) => (
                        <div key={it.id} className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ background: STATUS_COLOR[it.status] ?? "var(--color-muted)" }} title={`${elevName(it.elevator_id)} — ${it.type ?? "Bakım"}`}>
                          {elevName(it.elevator_id)}
                        </div>
                      ))}
                      {dayItems.length > 3 && <div className="px-1 text-[10px] text-muted">+{dayItems.length - 3} daha</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading && <p className="mt-3 text-center text-sm text-muted">Yükleniyor…</p>}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        {Object.entries({ pending: "Bekliyor", in_progress: "Devam Ediyor", completed: "Tamamlandı", cancelled: "İptal" }).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: STATUS_COLOR[k] }} /> {l}</span>
        ))}
      </div>
    </div>
  );
}
