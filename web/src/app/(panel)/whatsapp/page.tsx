"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MessageCircle } from "lucide-react";

type Log = {
  id: number; recipient: string; message: string;
  trigger_type: string | null; status: string | null; created_at: string;
};
type Paginated = { data: Log[]; meta: { total: number } };

const TRIGGER: Record<string, string> = {
  fault_created: "Arıza kaydı", fault_dispatched: "Yola çıkıldı",
  fault_diagnosed: "Tespit edildi", fault_resolved: "Giderildi",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

export default function WhatsAppPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/whatsapp/history")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageCircle className="text-success" />
        <h1 className="text-2xl font-bold text-ink">WhatsApp Bildirimleri</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        {total} otomatik mesaj · Arıza yaşam döngüsünde müşterilere otonom gönderilir.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Alıcı</th>
              <th className="px-4 py-3 font-medium">Tetikleyici</th>
              <th className="px-4 py-3 font-medium">Mesaj</th>
              <th className="px-4 py-3 font-medium text-right">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Henüz mesaj gönderilmedi.</td></tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{w.recipient}</td>
                  <td className="px-4 py-3">
                    {w.trigger_type && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        {TRIGGER[w.trigger_type] ?? w.trigger_type}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft max-w-md truncate">{w.message}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted">{fmt(w.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
