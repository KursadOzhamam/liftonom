"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Wrench, Wallet, Info } from "lucide-react";

type Row = { id: number; title: string; body: string | null; type: string | null; link: string | null; is_read: boolean; created_at: string };
type Paginated = { data: Row[]; meta: { total: number } };

const ICON: Record<string, React.ReactNode> = {
  fault: <AlertTriangle size={16} className="text-danger" />,
  maintenance: <Wrench size={16} className="text-warning" />,
  finance: <Wallet size={16} className="text-success" />,
  warning: <AlertTriangle size={16} className="text-warning" />,
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>("/notifications"); setRows(r.data); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function markRead(id: number) { await api(`/notifications/${id}/read`, { method: "POST", body: {} }); load(); }
  async function markAll() { await api("/notifications/read-all", { method: "POST", body: {} }); load(); }
  async function remove(id: number) { await api(`/notifications/${id}`, { method: "DELETE" }); load(); }

  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bildirimler</h1>
          <p className="mt-1 text-sm text-muted">{unread} okunmamış</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface">
            <CheckCheck size={15} /> Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        {loading ? (
          <div className="px-4 py-10 text-center text-muted">Yükleniyor…</div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center gap-2 px-4 py-16 text-muted"><Bell size={32} /> <span>Bildirim yok.</span></div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.is_read ? "" : "bg-primary/5"}`}>
                <div className="mt-0.5">{ICON[n.type ?? ""] ?? <Info size={16} className="text-primary" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${n.is_read ? "text-ink-soft" : "font-semibold text-ink"}`}>{n.title}</span>
                    {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <span className="text-xs text-muted">{dateTR(n.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!n.is_read && <button onClick={() => markRead(n.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Okundu"><Check size={15} /></button>}
                  <button onClick={() => remove(n.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
