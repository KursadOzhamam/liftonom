"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import { Wrench, AlertTriangle, ShieldCheck, Landmark } from "lucide-react";

type Maint = { id: number; planned_date: string | null; elevator?: { name: string } | null };
type Fault = { id: number; priority: string; description: string; elevator?: { name: string } | null };
type Tse = { id: number; name: string | null; tse_end_date: string | null; building?: { name: string } | null };
type Cashbox = { id: number; name: string; type: string; balance: string };

const PRIO: Record<string, string> = { urgent: "Acil", high: "Yüksek", normal: "Normal", low: "Düşük" };

export default function DashboardWidgets() {
  const [maint, setMaint] = useState<Maint[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [tse, setTse] = useState<Tse[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);

  useEffect(() => {
    api<Maint[]>("/dashboard/upcoming-maintenance").then(setMaint).catch(() => {});
    api<Fault[]>("/dashboard/open-faults").then(setFaults).catch(() => {});
    api<Tse[]>("/dashboard/tse-warnings").then(setTse).catch(() => {});
    api<Cashbox[]>("/dashboard/cashbox-summary").then(setCashboxes).catch(() => {});
  }, []);

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Widget title="Yaklaşan Bakımlar" icon={<Wrench size={16} className="text-warning" />} empty={maint.length === 0}>
        {maint.map((m) => (
          <Row key={m.id} left={m.elevator?.name ?? "—"} right={dateTR(m.planned_date)} />
        ))}
      </Widget>

      <Widget title="Açık Arızalar" icon={<AlertTriangle size={16} className="text-danger" />} empty={faults.length === 0}>
        {faults.map((f) => (
          <Row key={f.id} left={f.elevator?.name ?? "—"} sub={f.description}
            right={<span className="text-xs text-muted">{PRIO[f.priority] ?? f.priority}</span>} />
        ))}
      </Widget>

      <Widget title="TSE Uyarıları (30 gün)" icon={<ShieldCheck size={16} className="text-success" />} empty={tse.length === 0}>
        {tse.map((t) => (
          <Row key={t.id} left={t.name ?? "—"} sub={t.building?.name ?? undefined}
            right={<span className="text-xs font-medium text-warning">{dateTR(t.tse_end_date)}</span>} />
        ))}
      </Widget>

      <Widget title="Kasa Durumu" icon={<Landmark size={16} className="text-primary" />} empty={cashboxes.length === 0}>
        {cashboxes.map((c) => (
          <Row key={c.id} left={c.name} sub={c.type === "bank" ? "Banka" : "Nakit"}
            right={<span className="font-semibold text-ink">{TRY(Number(c.balance))}</span>} />
        ))}
      </Widget>
    </div>
  );
}

function Widget({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-3 divide-y divide-line">
        {empty ? <p className="py-4 text-center text-sm text-muted">Kayıt yok.</p> : children}
      </div>
    </div>
  );
}

function Row({ left, sub, right }: { left: string; sub?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{left}</div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
      </div>
      <div className="ml-3 shrink-0 text-sm text-ink-soft">{right}</div>
    </div>
  );
}
