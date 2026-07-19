"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import Badge from "@/components/Badge";
import { Send, FileDown, Pencil, ArrowLeft, Check, Copy } from "lucide-react";

type Clause = { title: string; body: string };
type Preview = {
  id: number; contract_number: string | null; type: string | null;
  start_date: string | null; end_date: string | null; monthly_fee: number | null; currency: string | null;
  period: string | null; annual_visits: number | null; renewal_notice_days: number;
  status: string; document_status: string; customer_name: string | null; rep_name: string | null;
  phone: string | null; email: string | null; terms: string | null; template_id: number | null;
  public_token: string | null; company_signature: string | null; customer_signature: string | null;
  customer: { name: string; authorized_person: string | null; phone: string | null; email: string | null } | null;
  building: { name: string; address: string | null; manager_name: string | null } | null;
  company: { name: string | null; phone: string | null; email: string | null; address: string | null; tax_number: string | null } | null;
  rendered_clauses: Clause[];
};

const money = (n: number | null, cur?: string | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${cur ?? "TRY"}`;
const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default function ContractPreviewPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const sp = useSearchParams();
  const [c, setC] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplMsg, setTplMsg] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  const load = useCallback(async () => {
    try { setC(await api<Preview>(`/contracts/${id}`)); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Yüklenemedi."); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { if (c && sp.get("print")) setTimeout(() => window.print(), 400); }, [c, sp]);

  async function saveSignature() {
    const sig = padRef.current?.dataUrl();
    if (!sig) { alert("Önce imza çizin."); return; }
    await api(`/contracts/${id}/signature`, { method: "POST", body: { signature: sig } });
    load();
  }

  async function send() {
    setBusy(true);
    try {
      const sig = padRef.current?.dataUrl() ?? c?.company_signature ?? null;
      await api(`/contracts/${id}/send`, { method: "POST", body: { signature: sig } });
      await load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Gönderilemedi."); }
    finally { setBusy(false); }
  }

  async function saveTemplate() {
    if (!tplName.trim()) { setTplMsg("Şablon adı girin."); return; }
    try {
      let clauses: unknown = [];
      let variables: unknown = [];
      if (c?.template_id) {
        const t = await api<{ clauses: string; variables: string }>(`/contracts/templates/${c.template_id}`);
        clauses = JSON.parse(t.clauses || "[]"); variables = JSON.parse(t.variables || "[]");
      } else if (c?.terms) {
        clauses = [{ title: "Sözleşme Şartları", body: c.terms, active: true }];
      }
      await api("/contracts/templates", { method: "POST", body: { name: tplName.trim(), type: "Bakım Sözleşmesi", clauses, variables } });
      setTplMsg("Şablon oluşturuldu."); setTplName("");
    } catch (e) { setTplMsg(e instanceof ApiError ? e.message : "Oluşturulamadı."); }
  }

  const publicUrl = c?.public_token && typeof window !== "undefined" ? `${window.location.origin}/contract/${c.public_token}` : "";

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  if (!c) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { padding: 0 !important; } .print-full { grid-template-columns: 1fr !important; } }`}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Önizleme: {c.contract_number ?? c.id}</h1>
          <p className="mt-1 text-sm text-muted">Müşterinin göreceği sözleşme önizlemesi — firma kaşeli / imzalı.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={send} disabled={busy} className="btn-primary"><Send size={15} /> Gönder</button>
          <button onClick={() => window.print()} className="btn-ghost"><FileDown size={15} /> PDF</button>
          <Link href={`/contracts/${id}/edit`} className="btn-ghost"><Pencil size={15} /> Düzenle</Link>
          <Link href="/contracts" className="btn-ghost"><ArrowLeft size={15} /> Listeye Dön</Link>
        </div>
      </div>

      <div className="no-print mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <Badge status={c.document_status} />
        <span className="text-xs text-muted">Belge: {c.status === "draft" ? "Taslak" : c.status}</span>
        {publicUrl && (
          <>
            <span className="ml-auto truncate text-xs text-muted">Müşteri Linki: {publicUrl}</span>
            <button onClick={copyLink} className="btn-ghost px-2.5 py-1.5 text-xs">
              {copied ? <><Check size={13} /> Kopyalandı</> : <><Copy size={13} /> Kopyala</>}
            </button>
          </>
        )}
      </div>

      <div className="print-full mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Belge */}
        <div className="rounded-2xl border border-line bg-card p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">{c.company?.name ?? "Firma"}</h2>
              <p className="text-sm text-muted">{c.company?.phone ?? ""}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Sözleşme No</p>
              <p className="text-lg font-bold text-ink">{c.contract_number ?? c.id}</p>
              <p className="mt-2 text-xs text-muted">Başlangıç <b className="text-ink">{dt(c.start_date)}</b></p>
              <p className="text-xs text-muted">Bitiş <b className="text-ink">{dt(c.end_date)}</b></p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="text-xs text-muted">Sayın Müşterimiz</p>
              <p className="font-semibold text-ink">{c.customer_name ?? c.customer?.name ?? "—"}</p>
              {c.rep_name && <p className="text-ink-soft">Yetkili: {c.rep_name}</p>}
              {c.phone && <p className="text-ink-soft">{c.phone}</p>}
              {c.email && <p className="text-ink-soft">{c.email}</p>}
              {c.building && <p className="mt-1 text-xs text-muted">Bina: {c.building.name}</p>}
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="font-semibold text-ink">{c.type ?? "Bakım"} Sözleşmesi</p>
              <p className="text-ink-soft">Periyot: {c.period ?? "—"}{c.annual_visits ? ` · Yıllık ${c.annual_visits} ziyaret` : ""}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs text-muted">Tutar</p>
              <p className="text-lg font-bold text-primary">{money(c.monthly_fee, c.currency)}</p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs text-muted">Yenileme Bildirimi</p>
              <p className="text-lg font-bold text-ink">{c.renewal_notice_days} gün</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {c.rendered_clauses.length > 0 ? c.rendered_clauses.map((cl, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-ink">{cl.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{cl.body}</p>
              </div>
            )) : c.terms ? (
              <div><h3 className="text-sm font-semibold text-ink">Sözleşme Şartları</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{c.terms}</p></div>
            ) : (
              <p className="text-sm text-muted">Bir şablon seçmediniz ve serbest şart girmediniz — belge boş görünecek.</p>
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
              <p className="mt-2 border-t border-line pt-2 font-medium text-ink">{c.customer_name ?? c.customer?.name}</p>
            </div>
          </div>
        </div>

        {/* Sağ panel */}
        <div className="no-print space-y-5">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Firma İmzası</h3>
            <p className="mt-1 text-xs text-muted">Aşağıdaki alana bu sözleşmeye özel imza/kaşe çizin.</p>
            <div className="mt-3"><SignaturePad ref={padRef} /></div>
            <button onClick={saveSignature} className="btn-primary mt-3 w-full justify-center">İmzayı Bu Sözleşmeye Kaydet</button>
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Sonraki Adım</h3>
            <p className="mt-1 text-xs text-muted">Sözleşme hazır. Müşteriye public linkten gönderin; müşteri imzaladığında belge durumu <b>Onaylandı</b>ya geçer.</p>
            <button onClick={send} disabled={busy} className="btn-primary mt-3 w-full justify-center"><Send size={15} /> Müşteriye Gönder</button>
            <button onClick={() => window.print()} className="btn-ghost mt-2 w-full justify-center"><FileDown size={15} /> PDF İndir</button>
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold text-ink">Şablon Olarak Kaydet</h3>
            <p className="mt-1 text-xs text-muted">Bu sözleşmenin madde yapısını yeniden kullanılabilir bir şablona dönüştürün. Müşteriye özel bilgiler taşınmaz.</p>
            <input className="input mt-3" placeholder="Şablon adı (örn. Standart Bakım)" value={tplName} onChange={(e) => setTplName(e.target.value)} />
            <button onClick={saveTemplate} className="btn-ghost mt-2 w-full justify-center">Şablon Oluştur</button>
            {tplMsg && <p className="mt-2 text-xs font-medium text-success">{tplMsg}</p>}
            <button onClick={() => router.push("/contracts")} className="mt-2 text-xs text-primary hover:underline">Tüm şablonları yönet →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── İmza Pad ─────────────────────────

type SignaturePadHandle = { dataUrl: () => string | null; clear: () => void };

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useImperativeHandle(ref, () => ({
    dataUrl: () => (dirty.current && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null),
    clear: () => {
      const cv = canvasRef.current; if (!cv) return;
      cv.getContext("2d")?.clearRect(0, 0, cv.width, cv.height); dirty.current = false;
    },
  }));

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round";
    const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); dirty.current = true;
  }
  function up() { drawing.current = false; }
  function clear() {
    const cv = canvasRef.current; if (!cv) return;
    cv.getContext("2d")?.clearRect(0, 0, cv.width, cv.height); dirty.current = false;
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={280} height={130}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="w-full touch-none rounded-lg border border-dashed border-line bg-surface" />
      <button onClick={clear} className="absolute right-2 top-2 rounded-md bg-card px-2 py-0.5 text-xs text-muted shadow-sm hover:text-ink">Temizle</button>
    </div>
  );
});
