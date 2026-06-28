"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import Badge from "@/components/Badge";
import { ArrowLeft, QrCode } from "lucide-react";

type Elevator = {
  id: number; name: string | null; brand: string | null; model: string | null; type: string | null;
  serial_number: string | null; status: string; tse_end_date: string | null;
  tse_label: "green" | "yellow" | "red" | "gray"; capacity_kg: number | null;
  building?: { name: string } | null;
};
type Maint = { id: number; type: string; status: string; planned_date: string | null; completed_at: string | null };
type Fault = { id: number; priority: string; status: string; description: string; created_at: string };

const TSE: Record<string, { c: string; l: string }> = {
  green: { c: "#16A34A", l: "Geçerli" }, yellow: { c: "#D97706", l: "Yaklaşıyor" },
  red: { c: "#DC2626", l: "Süresi Doldu" }, gray: { c: "#6B7280", l: "Belge Yok" },
};
const STATUS: Record<string, string> = { active: "Aktif", passive: "Pasif", faulty: "Arızalı" };
const TABS = ["genel", "bakim", "ariza"] as const;
const TAB_LABEL: Record<string, string> = { genel: "Genel", bakim: "Bakım Geçmişi", ariza: "Arızalar" };

export default function ElevatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>("genel");
  const [e, setE] = useState<Elevator | null>(null);
  const [maint, setMaint] = useState<Maint[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => { api<Elevator>(`/elevators/${id}`).then(setE); }, [id]);

  const loadTab = useCallback(() => {
    if (tab === "bakim") api<{ data: Maint[] }>(`/maintenance?elevator_id=${id}`).then((r) => setMaint(r.data));
    if (tab === "ariza") api<{ data: Fault[] }>(`/fault-reports?elevator_id=${id}`).then((r) => setFaults(r.data));
  }, [tab, id]);
  useEffect(() => { loadTab(); }, [loadTab]);

  async function showQr() {
    const r = await api<{ public_url: string }>(`/elevators/${id}/qr`);
    setQr(r.public_url);
  }

  if (!e) return <div className="text-muted">Yükleniyor…</div>;
  const tse = TSE[e.tse_label];

  return (
    <div>
      <Link href="/elevators" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Asansörler
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{e.name ?? `#${e.id}`}</h1>
          <span className="text-sm text-muted">{e.building?.name ?? "—"}</span>
        </div>
        <button onClick={showQr} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface">
          <QrCode size={16} /> QR Kod
        </button>
      </div>

      {qr && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary-light px-4 py-2 text-sm text-primary-dark break-all">
          QR linki: {qr}
        </div>
      )}

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
            <Info label="Marka" value={e.brand} />
            <Info label="Model" value={e.model} />
            <Info label="Tip" value={e.type} />
            <Info label="Seri No" value={e.serial_number} />
            <Info label="Kapasite" value={e.capacity_kg ? `${e.capacity_kg} kg` : null} />
            <Info label="Durum" value={STATUS[e.status] ?? e.status} />
            <div>
              <div className="text-xs text-muted">TSE Durumu</div>
              <div className="mt-0.5 font-medium" style={{ color: tse.c }}>
                {tse.l} {e.tse_end_date ? `· ${dateTR(e.tse_end_date)}` : ""}
              </div>
            </div>
          </div>
        )}

        {tab === "bakim" && (
          <Table cols={["Tip", "Planlanan", "Tamamlanma", "Durum"]} empty="Bakım kaydı yok.">
            {maint.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink-soft">{m.type}</td>
                <td className="px-4 py-3 text-ink-soft">{dateTR(m.planned_date)}</td>
                <td className="px-4 py-3 text-ink-soft">{dateTR(m.completed_at)}</td>
                <td className="px-4 py-3"><Badge status={m.status} /></td>
              </tr>
            ))}
          </Table>
        )}

        {tab === "ariza" && (
          <Table cols={["Açıklama", "Öncelik", "Durum", "Tarih"]} empty="Arıza kaydı yok.">
            {faults.map((f) => (
              <tr key={f.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink-soft max-w-xs truncate">{f.description}</td>
                <td className="px-4 py-3"><Badge status={f.priority} /></td>
                <td className="px-4 py-3"><Badge status={f.status} /></td>
                <td className="px-4 py-3 text-ink-soft">{dateTR(f.created_at)}</td>
              </tr>
            ))}
          </Table>
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

function Table({ cols, empty, children }: { cols: string[]; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          {cols.map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
        </tr></thead>
        <tbody>
          {children.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted">{empty}</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}
