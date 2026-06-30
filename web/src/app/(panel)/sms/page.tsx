"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { Send, MessageSquare } from "lucide-react";

type Balance = { balance: number };
type Prefs = Record<string, boolean | number>;
type Log = { id: number; recipient: string; message: string; status: string; sent_at: string };
type Paginated = { data: Log[]; meta: { total: number } };

const PREF_LABELS: Record<string, string> = {
  maintenance_reminder: "Bakım hatırlatması",
  maintenance_completed: "Bakım tamamlandı",
  new_fault: "Yeni arıza",
  fault_resolved: "Arıza çözüldü",
  invoice_created: "Fatura oluşturuldu",
  payment_received: "Ödeme alındı",
  tse_expiry: "TSE süresi doluyor",
};

export default function SmsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function refresh() {
    api<Balance>("/sms/balance").then((b) => setBalance(b.balance));
    api<Paginated>("/sms/history").then((r) => setLogs(r.data));
  }
  useEffect(() => {
    refresh();
    api<Prefs>("/sms/preferences").then(setPrefs);
  }, []);

  async function send() {
    setSending(true);
    try {
      await api("/sms/send", { method: "POST", body: { phone, message } });
      setMessage(""); setPhone("");
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Gönderilemedi.");
    } finally { setSending(false); }
  }

  async function togglePref(key: string, value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await api("/sms/preferences", { method: "PUT", body: { [key]: value } });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">SMS</h1>
      <p className="mt-1 text-sm text-muted">Bakiye, gönderim ve otomatik bildirim tercihleri.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Bakiye + Gönder */}
        <div className="space-y-5 lg:col-span-1">
          <div className="rounded-xl border border-line bg-primary p-5 text-white">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
              <MessageSquare size={14} /> SMS Bakiyesi
            </div>
            <div className="mt-1 text-3xl font-bold">{balance ?? "…"}</div>
          </div>

          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="text-sm font-semibold text-ink">Manuel SMS Gönder</h2>
            <div className="mt-3 space-y-3">
              <input className="input" placeholder="05XX XXX XX XX" value={phone}
                onChange={(e) => setPhone(e.target.value)} />
              <textarea className="input min-h-20" placeholder="Mesaj…" value={message}
                onChange={(e) => setMessage(e.target.value)} />
              <button onClick={send} disabled={sending || !phone || !message} className="btn-primary w-full">
                <Send size={16} /> {sending ? "Gönderiliyor…" : "Gönder"}
              </button>
            </div>
          </div>
        </div>

        {/* Tercihler + Geçmiş */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="text-sm font-semibold text-ink">Otomatik Bildirim Tercihleri</h2>
            <div className="mt-3 divide-y divide-line">
              {prefs && Object.keys(PREF_LABELS).map((key) => (
                <label key={key} className="flex cursor-pointer items-center justify-between py-2.5">
                  <span className="text-sm text-ink-soft">{PREF_LABELS[key]}</span>
                  <input type="checkbox" checked={Boolean(prefs[key])}
                    onChange={(e) => togglePref(key, e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-primary)]" />
                </label>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-card">
            <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Gönderim Geçmişi</div>
            <table className="w-full text-sm">
              <tbody>
                {logs.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-muted">Henüz SMS gönderilmemiş.</td></tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink-soft">{l.recipient}</td>
                      <td className="px-4 py-2.5 text-muted max-w-xs truncate">{l.message}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted">{dateTR(l.sent_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
