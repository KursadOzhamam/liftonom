"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, downloadFile } from "@/lib/api";
import Badge from "@/components/Badge";
import { FileDown, Pencil, ArrowLeft } from "lucide-react";

type Clause = { title: string; body: string };
type Preview = {
  id: number; quote_number: string | null; status: string; created_at: string; inspector_name: string | null;
  defects: string[]; actions: string[]; company_signature: string | null; customer_signature: string | null;
  elevator: {
    name: string | null; brand: string | null; model: string | null; serial_number: string | null;
    capacity_kg: number | null; capacity_persons: number | null; speed_ms: number | null; stop_count: number | null;
    building: { name: string | null; address: string | null; manager_name: string | null; manager_phone: string | null; manager_email: string | null } | null;
  } | null;
  company: { name: string | null; phone: string | null } | null;
  rendered_clauses: Clause[];
};

const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default function DtrPreviewPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [c, setC] = useState<Preview | null>(null);
  const buildRef = useRef<PadHandle>(null);
  const svcRef = useRef<PadHandle>(null);

  const load = useCallback(async () => {
    try { setC(await api<Preview>(`/quotes/${id}`)); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Yüklenemedi."); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  function pdf() { downloadFile(`/quotes/${id}/pdf`, `${c?.quote_number ?? `dtr-${id}`}.pdf`); }

  async function saveSig(role: "building" | "service", ref: React.RefObject<PadHandle | null>) {
    const sig = ref.current?.dataUrl();
    if (!sig) { alert("Önce imza çizin."); return; }
    await api(`/quotes/${id}/signature`, { method: "POST", body: { signature: sig, role } });
    load();
  }

  if (!c) return <p className="text-muted">Yükleniyor…</p>;
  const el = c.elevator; const b = el?.building;
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex border-b border-line py-2 text-sm last:border-0">
      <span className="w-40 shrink-0 font-semibold text-ink">{k}</span><span className="text-ink-soft">{v}</span>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">DTR Önizleme: {c.quote_number ?? `#${c.id}`}</h1>
          <p className="mt-1 text-sm text-muted">Durum Tespit Raporu — sahada bina sorumlusu ve yetkili servis imzası alın.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={pdf} className="btn-ghost"><FileDown size={15} /> PDF</button>
          <Link href={`/dtr/${id}/edit`} className="btn-ghost"><Pencil size={15} /> Düzenle</Link>
          <Link href="/dtr" className="btn-ghost"><ArrowLeft size={15} /> Listeye Dön</Link>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <Badge status={c.status} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-line bg-card p-8">
          <div className="flex items-start justify-between border-b border-primary pb-3">
            <div>
              <h2 className="text-xl font-bold text-primary">{c.company?.name ?? "Firma"}</h2>
              <p className="text-sm text-muted">{c.company?.phone ?? ""}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-lg font-bold text-ink">DURUM TESPİT RAPORU</p>
              <p className="text-xs text-muted">Rapor Tarihi</p>
              <p className="font-bold text-ink">{dt(c.created_at)}</p>
            </div>
          </div>

          <h3 className="mt-5 text-sm font-bold uppercase text-primary">Asansöre İlişkin Bilgiler</h3>
          <div className="mt-2">
            <Row k="Asansör Adı / No" v={el?.name ?? "—"} />
            <Row k="Marka" v={el?.brand ?? "—"} />
            <Row k="Model" v={el?.model ?? "—"} />
            <Row k="Seri No" v={el?.serial_number ?? "—"} />
            <Row k="Kapasite" v={`${el?.capacity_kg ?? "—"} kg / ${el?.capacity_persons ?? "—"} kişi`} />
            <Row k="Hız" v={el?.speed_ms != null ? `${el.speed_ms} m/s` : "—"} />
            <Row k="Durak Sayısı" v={String(el?.stop_count ?? "—")} />
          </div>

          <h3 className="mt-5 text-sm font-bold uppercase text-primary">Bina Yapı ve Bina Sorumlusu</h3>
          <div className="mt-2">
            <Row k="Bina Adı" v={b?.name ?? "—"} />
            <Row k="Bina Adresi" v={b?.address ?? "—"} />
            <Row k="Bina Sorumlusu" v={b?.manager_name ?? "—"} />
            <Row k="Telefon" v={b?.manager_phone ?? "—"} />
            <Row k="E-posta" v={b?.manager_email ?? "—"} />
          </div>

          <h3 className="mt-5 text-sm font-bold uppercase text-primary">Asansörün Durumuna İlişkin Bilgiler</h3>
          <p className="mt-2 text-sm font-semibold text-ink">Tespit Edilen Eksiklik / Kusurlar:</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-6 text-sm text-ink-soft">
            {c.defects.length ? c.defects.map((d, i) => <li key={i}>{d}</li>) : <li className="list-none text-muted">—</li>}
          </ol>
          <p className="mt-3 text-sm font-semibold text-ink">Yapılması Gereken İşlemler:</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-6 text-sm text-ink-soft">
            {c.actions.length ? c.actions.map((a, i) => <li key={i}>{a}</li>) : <li className="list-none text-muted">—</li>}
          </ol>

          <div className="mt-6 space-y-4">
            {c.rendered_clauses.map((cl, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-ink">{cl.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{cl.body}</p>
              </div>
            ))}
            {c.inspector_name && <p className="text-sm text-ink-soft">Yetkili Servis: <b className="text-ink">{c.inspector_name}</b></p>}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-line pt-6 text-center text-sm">
            <div>
              <p className="mb-2 text-xs text-muted">Bina Sorumlusu Yetkili İmzası</p>
              {c.customer_signature ? <img src={c.customer_signature} alt="bina" className="mx-auto h-16 object-contain" /> : <p className="text-xs text-muted">İmzalanmadı</p>}
              <p className="mt-2 border-t border-line pt-2 font-medium text-ink">{b?.manager_name ?? ""}</p>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted">Asansör Yetkili Servisi İmzası</p>
              {c.company_signature ? <img src={c.company_signature} alt="servis" className="mx-auto h-16 object-contain" /> : <p className="text-xs text-muted">İmzalanmadı</p>}
              <p className="mt-2 border-t border-line pt-2 font-medium text-ink">{c.inspector_name ?? ""}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">1) Bina Sorumlusu İmzası</h3>
            <p className="mt-1 text-xs text-muted">Bina sorumlusuna tableti uzatın, aşağıya imza atsın.</p>
            <div className="mt-3"><SignaturePad ref={buildRef} /></div>
            <button onClick={() => saveSig("building", buildRef)} className="btn-primary mt-3 w-full justify-center">Bina Sorumlusu İmzasını Kaydet</button>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">2) Yetkili Servis İmzası</h3>
            <p className="mt-1 text-xs text-muted">Sahadaki yetkili servis bu cihazdan imzalar.</p>
            <div className="mt-3"><SignaturePad ref={svcRef} /></div>
            <button onClick={() => saveSig("service", svcRef)} className="btn-primary mt-3 w-full justify-center">Yetkili Servis İmzasını Kaydet</button>
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
      <canvas ref={canvasRef} width={280} height={150} onPointerDown={down} onPointerMove={move} onPointerUp={() => (drawing.current = false)} onPointerLeave={() => (drawing.current = false)}
        className="w-full touch-none rounded-lg border border-dashed border-line bg-surface" />
      <button onClick={clear} className="absolute right-2 top-2 rounded-md bg-card px-2 py-0.5 text-xs text-muted shadow-sm hover:text-ink">Temizle</button>
    </div>
  );
});
