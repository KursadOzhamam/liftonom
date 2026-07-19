"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, downloadFile } from "@/lib/api";
import { useConfirm } from "@/components/ConfirmDialog";
import Badge from "@/components/Badge";
import { Send, FileDown, Pencil, ArrowLeft, Check, Copy } from "lucide-react";

type Clause = { title: string; body: string };
type Preview = {
  id: number; quote_number: string | null; status: string; currency: string | null; valid_until: string | null;
  created_at: string; total: number | null; unit_price: number | null; notes: string | null; payment_terms: string | null;
  customer_name: string | null; email: string | null; phone: string | null; address: string | null;
  public_token: string | null; company_signature: string | null; customer_signature: string | null;
  elevator_type: string | null; elevator_count: number | null; capacity_kg: number | null; capacity_persons: number | null;
  floor_count: number | null; stop_count: number | null; speed_ms: number | null; door_type: string | null;
  control_system: string | null; warranty_years: number | null; delivery_days: number | null;
  company: { name: string | null; phone: string | null } | null;
  rendered_clauses: Clause[];
};

const money = (n: number | null, cur?: string | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${cur ?? "TRY"}`;
const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default function AtfPreviewPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const sp = useSearchParams();
  const confirm = useConfirm();
  const [c, setC] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const padRef = useRef<PadHandle>(null);
  const autoSent = useRef(false);

  const load = useCallback(async () => {
    try { setC(await api<Preview>(`/quotes/${id}`)); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Yüklenemedi."); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  function pdf() { downloadFile(`/quotes/${id}/pdf`, `${c?.quote_number ?? `atf-${id}`}.pdf`); }

  async function saveSignature() {
    const sig = padRef.current?.dataUrl();
    if (!sig) { alert("Önce imza çizin."); return; }
    await api(`/quotes/${id}/signature`, { method: "POST", body: { signature: sig } });
    load();
  }

  async function send() {
    const email = c?.email || "";
    let sendEmail = false;
    if (email) {
      sendEmail = await confirm(`Form müşterinin e-posta adresine (${email}) PDF ekiyle gönderilsin mi?`, { danger: false, confirmText: "E-posta ile gönder", cancelText: "E-postasız işaretle" });
    } else {
      const ok = await confirm("Talep edenin e-posta adresi yok — e-posta ile gönderilemez. Yine de 'Gönderildi' olarak işaretlensin mi?", { danger: true });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const sig = padRef.current?.dataUrl() ?? c?.company_signature ?? null;
      const r = await api<{ email_sent: boolean; email_error: string | null }>(`/quotes/${id}/send`, { method: "POST", body: { signature: sig, send_email: sendEmail } });
      await load();
      if (sendEmail) alert(r.email_sent ? `Form ${email} adresine gönderildi.` : `Belge 'Gönderildi' işaretlendi ancak e-posta iletilemedi: ${r.email_error ?? "bilinmeyen hata"}`);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Gönderilemedi."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (c && sp.get("send") && !autoSent.current) { autoSent.current = true; send(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, sp]);

  const publicUrl = c?.public_token && typeof window !== "undefined" ? `${window.location.origin}/talep-formu/${c.public_token}` : "";
  function copyLink() { if (!publicUrl) return; navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  if (!c) return <p className="text-muted">Yükleniyor…</p>;

  const Spec = ({ k, v }: { k: string; v: string }) => <p className="text-ink-soft"><b className="text-ink">{k}:</b> {v}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Önizleme: {c.quote_number ?? c.id}</h1>
          <p className="mt-1 text-sm text-muted">Asansör Talep Formu — yeni montaj teklifi önizlemesi.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={send} disabled={busy} className="btn-primary"><Send size={15} /> Gönder</button>
          <button onClick={pdf} className="btn-ghost"><FileDown size={15} /> PDF</button>
          <Link href={`/atf/${id}/edit`} className="btn-ghost"><Pencil size={15} /> Düzenle</Link>
          <Link href="/atf" className="btn-ghost"><ArrowLeft size={15} /> Listeye Dön</Link>
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
              <p className="text-xs uppercase tracking-wide text-muted">ATF No</p>
              <p className="text-lg font-bold text-ink">{c.quote_number ?? c.id}</p>
              <p className="mt-2 text-xs text-muted">Tarih <b className="text-ink">{dt(c.created_at)}</b></p>
              <p className="text-xs text-muted">Geçerlilik <b className="text-ink">{dt(c.valid_until)}</b></p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="text-xs text-muted">Talep Eden</p>
              <p className="font-semibold text-ink">{c.customer_name ?? "—"}</p>
              {c.phone && <p className="text-ink-soft">{c.phone}</p>}
              {c.email && <p className="text-ink-soft">{c.email}</p>}
              {c.address && <p className="text-ink-soft">{c.address}</p>}
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="mb-1 text-xs text-muted">Asansör Spesifikasyonu</p>
              <Spec k="Tip" v={c.elevator_type ?? "—"} />
              <Spec k="Adet" v={String(c.elevator_count ?? "—")} />
              <Spec k="Kapasite" v={`${c.capacity_kg ?? "—"} kg · ${c.capacity_persons ?? "—"} kişi`} />
              <Spec k="Kat / Durak" v={`${c.floor_count ?? "—"} / ${c.stop_count ?? "—"}`} />
              <Spec k="Hız" v={c.speed_ms != null ? `${c.speed_ms} m/s` : "—"} />
              <Spec k="Kapı" v={c.door_type ?? "—"} />
              <Spec k="Kumanda" v={c.control_system ?? "—"} />
            </div>
          </div>

          {c.notes && <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm text-ink-soft">{c.notes}</div>}

          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Kalem</th>
                  <th className="px-3 py-2 text-right font-medium">Tutar (KDV Dahil)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line"><td className="px-3 py-2 text-ink">Birim Fiyat (Asansör Başına)</td><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{money(c.unit_price, c.currency)}</td></tr>
                <tr><td className="px-3 py-2 text-ink">Genel Toplam ({c.elevator_count ?? 1} adet)</td><td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">{money(c.total, c.currency)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-right text-xs text-muted">Tutarlar KDV dahildir.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Garanti</p><p className="font-bold text-ink">{c.warranty_years ?? "—"} yıl</p></div>
            <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Teslim</p><p className="font-bold text-ink">{c.delivery_days ?? "—"} iş günü</p></div>
            <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Ödeme</p><p className="text-sm text-ink-soft">{c.payment_terms ?? "—"}</p></div>
          </div>

          <div className="mt-6 space-y-4">
            {c.rendered_clauses.map((cl, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-ink">{cl.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{cl.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-line pt-6 text-center text-sm">
            <div>
              <p className="mb-2 text-xs text-muted">Firma Kaşesi / İmzası</p>
              {c.company_signature ? <img src={c.company_signature} alt="firma imza" className="mx-auto h-16 object-contain" /> : <p className="text-xs text-danger">Kaşe/imza yüklenmedi</p>}
              <p className="mt-2 border-t border-line pt-2 font-medium text-ink">{c.company?.name}</p>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted">Talep Eden İmzası</p>
              {c.customer_signature ? <img src={c.customer_signature} alt="müşteri imza" className="mx-auto h-16 object-contain" /> : <p className="text-xs text-muted">Müşteri public sayfadan atacak</p>}
              <p className="mt-2 border-t border-line pt-2 font-medium text-ink">{c.customer_name}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Firma İmzası</h3>
            <p className="mt-1 text-xs text-muted">Bu forma özel imza/kaşe çizin.</p>
            <div className="mt-3"><SignaturePad ref={padRef} /></div>
            <button onClick={saveSignature} className="btn-primary mt-3 w-full justify-center">İmzayı Bu Forma Kaydet</button>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Sonraki Adım</h3>
            <p className="mt-1 text-xs text-muted">Form hazır. Müşteriye public linkten gönderin; müşteri imzalayıp onayladığında durum <b>Kabul</b>&apos;e geçer.</p>
            <button onClick={send} disabled={busy} className="btn-primary mt-3 w-full justify-center"><Send size={15} /> Müşteriye Gönder</button>
            <button onClick={pdf} className="btn-ghost mt-2 w-full justify-center"><FileDown size={15} /> PDF İndir</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type PadHandle = { dataUrl: () => string | null };

const SignaturePad = forwardRef<PadHandle>(function SignaturePad(_p, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  useImperativeHandle(ref, () => ({ dataUrl: () => (dirty.current && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null) }));
  function pos(e: React.PointerEvent<HTMLCanvasElement>) { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function down(e: React.PointerEvent<HTMLCanvasElement>) { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const ctx = canvasRef.current!.getContext("2d")!; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }
  function move(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const ctx = canvasRef.current!.getContext("2d")!; ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); dirty.current = true; }
  function clear() { const cv = canvasRef.current; if (cv) { cv.getContext("2d")?.clearRect(0, 0, cv.width, cv.height); dirty.current = false; } }
  return (
    <div className="relative">
      <canvas ref={canvasRef} width={280} height={130} onPointerDown={down} onPointerMove={move} onPointerUp={() => (drawing.current = false)} onPointerLeave={() => (drawing.current = false)}
        className="w-full touch-none rounded-lg border border-dashed border-line bg-surface" />
      <button onClick={clear} className="absolute right-2 top-2 rounded-md bg-card px-2 py-0.5 text-xs text-muted shadow-sm hover:text-ink">Temizle</button>
    </div>
  );
});
