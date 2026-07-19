"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type Clause = { title: string; body: string };
type Pub = {
  quote_number: string | null; status: string; currency: string | null; valid_until: string | null; created_at: string;
  total: number | null; labor_total: number | null; material_total: number | null; price_visible: boolean;
  terms: string | null; customer_name: string | null;
  company_signature: string | null; customer_signature: string | null;
  elevator: { name: string | null; building: { name: string | null; address: string | null } | null } | null;
  company: { name: string | null; phone: string | null; email: string | null; address: string | null } | null;
  rendered_clauses: Clause[];
};

const money = (n: number | null, cur?: string | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${cur ?? "TRY"}`;
const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default function PublicRevisionPage() {
  const { token } = useParams<{ token: string }>();
  const [c, setC] = useState<Pub | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const load = useCallback(async () => {
    try { setC(await api<Pub>(`/public/quotes/${token}`, { auth: false })); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Teklif bulunamadı."); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function down(e: React.PointerEvent<HTMLCanvasElement>) { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const ctx = canvasRef.current!.getContext("2d")!; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }
  function moveP(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const ctx = canvasRef.current!.getContext("2d")!; ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); dirty.current = true; }
  function clear() { const cv = canvasRef.current; if (cv) { cv.getContext("2d")?.clearRect(0, 0, cv.width, cv.height); dirty.current = false; } }

  async function approve() {
    const sig = dirty.current && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null;
    if (!sig) { alert("Lütfen imza alanına imzanızı çizin."); return; }
    setBusy(true);
    try { await api(`/public/quotes/${token}/approve`, { method: "POST", body: { signature: sig }, auth: false }); setDone(true); await load(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Onaylanamadı."); }
    finally { setBusy(false); }
  }

  if (err) return <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-600">{err}</div>;
  if (!c) return <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-500">Yükleniyor…</div>;
  const approved = c.status === "approved" || done;
  const priceOn = c.price_visible;

  return (
    <div className="min-h-screen bg-slate-100 py-8 text-slate-800">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-indigo-600">{c.company?.name ?? "Firma"}</h1>
              <p className="text-sm text-slate-500">{c.company?.phone} {c.company?.email}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Revizyon Teklifi No</p>
              <p className="text-lg font-bold">{c.quote_number}</p>
              <p className="mt-1 text-xs text-slate-500">{dt(c.created_at)} · Geçerlilik {dt(c.valid_until)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs text-slate-400">Sayın Müşterimiz</p>
              <p className="font-semibold">{c.customer_name ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs text-slate-400">Asansör</p>
              <p className="font-semibold">{c.elevator?.name ?? "—"}</p>
              {c.elevator?.building && <p className="text-slate-600">{c.elevator.building.name}</p>}
            </div>
          </div>

          {priceOn && (
            <>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2 font-medium">Kalem</th>
                      <th className="px-3 py-2 text-right font-medium">Tutar (KDV Dahil)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100"><td className="px-3 py-2">İşçilik</td><td className="px-3 py-2 text-right tabular-nums text-slate-600">{money(c.labor_total, c.currency)}</td></tr>
                    <tr><td className="px-3 py-2">Malzeme</td><td className="px-3 py-2 text-right tabular-nums text-slate-600">{money(c.material_total, c.currency)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-right">
                <p className="text-lg font-bold text-indigo-600">GENEL TOPLAM: {money(c.total, c.currency)}</p>
                <p className="text-xs text-slate-400">Tutarlar KDV dahildir.</p>
              </div>
            </>
          )}

          <div className="mt-6 space-y-4">
            {c.rendered_clauses.length > 0 ? c.rendered_clauses.map((cl, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold">{cl.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{cl.body}</p>
              </div>
            )) : c.terms ? (
              <div><h3 className="text-sm font-semibold">Şartlar</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{c.terms}</p></div>
            ) : null}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-8 border-t border-slate-200 pt-6 text-center text-sm">
            <div>
              <p className="mb-2 text-xs text-slate-400">Firma Kaşesi / İmzası</p>
              {c.company_signature ? <img src={c.company_signature} alt="firma" className="mx-auto h-16 object-contain" /> : <p className="text-xs text-slate-400">—</p>}
              <p className="mt-2 border-t border-slate-200 pt-2 font-medium">{c.company?.name}</p>
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-400">Müşteri İmzası</p>
              {c.customer_signature ? <img src={c.customer_signature} alt="müşteri" className="mx-auto h-16 object-contain" /> : <p className="text-xs text-slate-400">İmzalanmadı</p>}
              <p className="mt-2 border-t border-slate-200 pt-2 font-medium">{c.customer_name}</p>
            </div>
          </div>
        </div>

        {approved ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-700">✓ Teklif kabul edildi. Teşekkür ederiz.</div>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold">Teklifi Kabul Et</h3>
            <p className="mt-1 text-xs text-slate-500">Aşağıdaki alana imzanızı çizin ve onaylayın.</p>
            <div className="relative mt-3">
              <canvas ref={canvasRef} width={320} height={140} onPointerDown={down} onPointerMove={moveP} onPointerUp={() => (drawing.current = false)} onPointerLeave={() => (drawing.current = false)}
                className="w-full touch-none rounded-lg border border-dashed border-slate-300 bg-slate-50" />
              <button onClick={clear} className="absolute right-2 top-2 rounded-md bg-white px-2 py-0.5 text-xs text-slate-400 shadow-sm">Temizle</button>
            </div>
            <button onClick={approve} disabled={busy} className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {busy ? "Gönderiliyor…" : "İmzala ve Kabul Et"}
            </button>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-slate-400">Bu teklif {c.company?.name} tarafından gönderilmiştir.</p>
      </div>
    </div>
  );
}
