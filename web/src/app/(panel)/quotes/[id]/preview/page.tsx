"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, downloadFile } from "@/lib/api";
import { useConfirm } from "@/components/ConfirmDialog";
import Badge from "@/components/Badge";
import { Send, FileDown, Pencil, ArrowLeft, Check, Copy } from "lucide-react";

type Clause = { title: string; body: string };
type Item = { description: string; quantity: number; unit_price: number; total: number };
type Preview = {
  id: number; quote_number: string | null; type: string | null; status: string; title: string | null;
  currency: string | null; valid_until: string | null; created_at: string;
  subtotal: number | null; discount: number | null; total: number | null; terms: string | null; notes: string | null;
  template_id: number | null; customer_name: string | null; email: string | null; phone: string | null;
  public_token: string | null;
  customer: { name: string; phone: string | null; email: string | null } | null;
  company: { name: string | null; phone: string | null; email: string | null; address: string | null } | null;
  items: Item[]; rendered_clauses: Clause[];
};

const money = (n: number | null, cur?: string | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${cur ?? "TRY"}`;
const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default function QuotePreviewPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const sp = useSearchParams();
  const confirm = useConfirm();
  const [c, setC] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoSent = useRef(false);

  const load = useCallback(async () => {
    try { setC(await api<Preview>(`/quotes/${id}`)); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Yüklenemedi."); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  function pdf() { downloadFile(`/quotes/${id}/pdf`, `${c?.quote_number ?? `teklif-${id}`}.pdf`); }

  async function send() {
    const email = c?.email || c?.customer?.email || "";
    let sendEmail = false;
    if (email) {
      sendEmail = await confirm(`Teklif müşterinin e-posta adresine (${email}) PDF ekiyle gönderilsin mi?`, { danger: false, confirmText: "E-posta ile gönder", cancelText: "E-postasız işaretle" });
    } else {
      const ok = await confirm("Müşterinin e-posta adresi yok — e-posta ile gönderilemez. Yine de 'Gönderildi' olarak işaretlensin mi?", { danger: true });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await api<{ email_sent: boolean; email_error: string | null }>(`/quotes/${id}/send`, { method: "POST", body: { send_email: sendEmail } });
      await load();
      if (sendEmail) alert(r.email_sent ? `Teklif ${email} adresine gönderildi.` : `Belge 'Gönderildi' işaretlendi ancak e-posta iletilemedi: ${r.email_error ?? "bilinmeyen hata"}`);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Gönderilemedi."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (c && sp.get("send") && !autoSent.current) { autoSent.current = true; send(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, sp]);

  const publicUrl = c?.public_token && typeof window !== "undefined" ? `${window.location.origin}/quote/${c.public_token}` : "";
  function copyLink() { if (!publicUrl) return; navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  if (!c) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Önizleme: {c.quote_number ?? c.id}</h1>
          <p className="mt-1 text-sm text-muted">Müşterinin göreceği teklif önizlemesi.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={send} disabled={busy} className="btn-primary"><Send size={15} /> Gönder</button>
          <button onClick={pdf} className="btn-ghost"><FileDown size={15} /> PDF</button>
          <Link href={`/quotes/${id}/edit`} className="btn-ghost"><Pencil size={15} /> Düzenle</Link>
          <Link href="/quotes" className="btn-ghost"><ArrowLeft size={15} /> Listeye Dön</Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <Badge status={c.status} />
        {publicUrl && (
          <>
            <span className="ml-auto truncate text-xs text-muted">Müşteri Linki: {publicUrl}</span>
            <button onClick={copyLink} className="btn-ghost px-2.5 py-1.5 text-xs">
              {copied ? <><Check size={13} /> Kopyalandı</> : <><Copy size={13} /> Kopyala</>}
            </button>
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-line bg-card p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">{c.company?.name ?? "Firma"}</h2>
              <p className="text-sm text-muted">{c.company?.phone ?? ""}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Teklif No</p>
              <p className="text-lg font-bold text-ink">{c.quote_number ?? c.id}</p>
              <p className="mt-2 text-xs text-muted">Tarih <b className="text-ink">{dt(c.created_at)}</b></p>
              <p className="text-xs text-muted">Geçerlilik <b className="text-ink">{dt(c.valid_until)}</b></p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
            <p className="text-xs text-muted">Sayın Müşterimiz</p>
            <p className="font-semibold text-ink">{c.customer_name ?? c.customer?.name ?? "—"}</p>
            {c.title && <p className="text-ink-soft">Konu: {c.title}</p>}
            {c.phone && <p className="text-ink-soft">{c.phone}</p>}
            {c.email && <p className="text-ink-soft">{c.email}</p>}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Açıklama</th>
                  <th className="px-3 py-2 text-right font-medium">Miktar</th>
                  <th className="px-3 py-2 text-right font-medium">Birim Fiyat</th>
                  <th className="px-3 py-2 text-right font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {c.items.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">Kalem yok.</td></tr>
                ) : c.items.map((it, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{it.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{it.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{money(it.unit_price, c.currency)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{money(it.total, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col items-end">
            {c.discount ? <p className="text-sm text-muted">İndirim: {money(c.discount, c.currency)}</p> : null}
            <p className="text-lg font-bold text-primary">Genel Toplam: {money(c.total, c.currency)}</p>
            <p className="text-xs text-muted">Tutarlar KDV dahildir.</p>
          </div>

          <div className="mt-6 space-y-4">
            {c.rendered_clauses.length > 0 ? c.rendered_clauses.map((cl, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-ink">{cl.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{cl.body}</p>
              </div>
            )) : c.terms ? (
              <div><h3 className="text-sm font-semibold text-ink">Şartlar</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{c.terms}</p></div>
            ) : null}
            {c.notes && (
              <div><h3 className="text-sm font-semibold text-ink">Notlar</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{c.notes}</p></div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Sonraki Adım</h3>
            <p className="mt-1 text-xs text-muted">Teklif hazır. Müşteriye public linkten gönderin veya PDF indirin.</p>
            <button onClick={send} disabled={busy} className="btn-primary mt-3 w-full justify-center"><Send size={15} /> Müşteriye Gönder</button>
            <button onClick={pdf} className="btn-ghost mt-2 w-full justify-center"><FileDown size={15} /> PDF İndir</button>
          </div>
        </div>
      </div>
    </div>
  );
}
