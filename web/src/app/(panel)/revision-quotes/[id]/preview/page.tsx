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
  id: number; quote_number: string | null; status: string; currency: string | null;
  valid_until: string | null; created_at: string; total: number | null; labor_total: number | null;
  material_total: number | null; price_visible: boolean; terms: string | null; notes: string | null;
  contact_name: string | null; email: string | null; phone: string | null; public_token: string | null;
  company_signature: string | null; customer_signature: string | null;
  customer: { name: string; email: string | null } | null;
  elevator: { name: string | null; building: { name: string | null; address: string | null } | null } | null;
  company: { name: string | null; phone: string | null; email: string | null; address: string | null } | null;
  rendered_clauses: Clause[];
};

const money = (n: number | null, cur?: string | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${cur ?? "TRY"}`;
const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default function RevisionPreviewPage() {
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

  function pdf() { downloadFile(`/quotes/${id}/pdf`, `${c?.quote_number ?? `revizyon-${id}`}.pdf`); }

  async function saveSignature() {
    const sig = padRef.current?.dataUrl();
    if (!sig) { alert("Önce imza çizin."); return; }
    await api(`/quotes/${id}/signature`, { method: "POST", body: { signature: sig } });
    load();
  }

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
      const sig = padRef.current?.dataUrl() ?? c?.company_signature ?? null;
      const r = await api<{ email_sent: boolean; email_error: string | null }>(`/quotes/${id}/send`, { method: "POST", body: { signature: sig, send_email: sendEmail } });
      await load();
      if (sendEmail) alert(r.email_sent ? `Teklif ${email} adresine gönderildi.` : `Belge 'Gönderildi' işaretlendi ancak e-posta iletilemedi: ${r.email_error ?? "bilinmeyen hata"}`);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Gönderilemedi."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (c && sp.get("send") && !autoSent.current) { autoSent.current = true; send(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, sp]);

  const publicUrl = c?.public_token && typeof window !== "undefined" ? `${window.location.origin}/revizyon-teklifi/${c.public_token}` : "";
  function copyLink() { if (!publicUrl) return; navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  if (!c) return <p className="text-muted">Yükleniyor…</p>;
  const priceOn = c.price_visible;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Önizleme: {c.quote_number ?? c.id}</h1>
          <p className="mt-1 text-sm text-muted">Müşterinin göreceği revizyon teklifi önizlemesi — firma kaşeli / imzalı.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={send} disabled={busy} className="btn-primary"><Send size={15} /> Gönder</button>
          <button onClick={pdf} className="btn-ghost"><FileDown size={15} /> PDF</button>
          <Link href={`/revision-quotes/${id}/edit`} className="btn-ghost"><Pencil size={15} /> Düzenle</Link>
          <Link href="/revision-quotes" className="btn-ghost"><ArrowLeft size={15} /> Listeye Dön</Link>
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
              <p className="text-xs uppercase tracking-wide text-muted">Revizyon Teklifi No</p>
              <p className="text-lg font-bold text-ink">{c.quote_number ?? c.id}</p>
              <p className="mt-2 text-xs text-muted">Düzenleme <b className="text-ink">{dt(c.created_at)}</b></p>
              <p className="text-xs text-muted">Geçerlilik <b className="text-ink">{dt(c.valid_until)}</b></p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="text-xs text-muted">Sayın Müşterimiz</p>
              <p className="font-semibold text-ink">{c.contact_name ?? c.customer?.name ?? "—"}</p>
              {c.phone && <p className="text-ink-soft">{c.phone}</p>}
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="text-xs text-muted">Asansör</p>
              <p className="font-semibold text-ink">{c.elevator?.name ?? "—"}</p>
              {c.elevator?.building && <p className="text-ink-soft">{c.elevator.building.name}{c.elevator.building.address ? ` · ${c.elevator.building.address}` : ""}</p>}
            </div>
          </div>

          {priceOn ? (
            <>
              <div className="mt-4 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-3 py-2 font-medium">Kalem</th>
                      <th className="px-3 py-2 text-right font-medium">Tutar (KDV Dahil)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line"><td className="px-3 py-2 text-ink">İşçilik</td><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{money(c.labor_total, c.currency)}</td></tr>
                    <tr><td className="px-3 py-2 text-ink">Malzeme</td><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{money(c.material_total, c.currency)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-right">
                <p className="text-lg font-bold text-primary">GENEL TOPLAM: {money(c.total, c.currency)}</p>
                <p className="text-xs text-muted">Tutarlar KDV dahildir.</p>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-line bg-surface p-4 text-sm text-muted">Fiyat bu teklifte müşteriye gösterilmiyor.</div>
          )}

          <div className="mt-6 space-y-4">
            {c.rendered_clauses.length > 0 ? c.rendered_clauses.map((cl, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-ink">{cl.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{cl.body}</p>
              </div>
            )) : c.terms ? (
              <div><h3 className="text-sm font-semibold text-ink">Şartlar</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{c.terms}</p></div>
            ) : null}
            {c.notes && (
              <div><h3 className="text-sm font-semibold text-ink">Açıklama</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{c.notes}</p></div>
            )}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-line pt-6 text-center text-sm">
            <div>
              <p className="mb-2 text-xs text-muted">Firma Kaşesi / İmzası</p>
              {c.company_signature
                ? <img src={c.company_signature} alt="firma imza" className="mx-auto h-16 object-contain" />
                : <p className="text-xs text-danger">Kaşe/imza yüklenmedi</p>}
              <p className="mt-2 border-t border-line pt-2 font-medium text-ink">{c.company?.name}</p>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted">Müşteri İmzası</p>
              {c.customer_signature
                ? <img src={c.customer_signature} alt="müşteri imza" className="mx-auto h-16 object-contain" />
                : <p className="text-xs text-muted">Müşteri public sayfadan atacak</p>}
              <p className="mt-2 border-t border-line pt-2 font-medium text-ink">{c.contact_name ?? c.customer?.name}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Firma İmzası</h3>
            <p className="mt-1 text-xs text-muted">Bu teklife özel imza/kaşe çizin.</p>
            <div className="mt-3"><SignaturePad ref={padRef} /></div>
            <button onClick={saveSignature} className="btn-primary mt-3 w-full justify-center">İmzayı Bu Teklife Kaydet</button>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Sonraki Adım</h3>
            <p className="mt-1 text-xs text-muted">Teklif hazır. Müşteriye public linkten gönderin; müşteri imzalayıp onayladığında durum <b>Kabul</b>&apos;e geçer.</p>
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
