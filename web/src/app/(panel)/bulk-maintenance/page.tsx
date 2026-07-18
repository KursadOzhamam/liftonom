"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { CalendarPlus, CheckCircle2, Eye } from "lucide-react";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const nowD = new Date();

type PlanItem = { elevator_id: number; elevator_name: string; building_name: string; planned_date: string; technician_id: number | null; technician_name: string | null };
type Preview = { preview: true; count: number; skipped: number; total: number; items: PlanItem[] };
type Created = { message: string; created: number; skipped: number; total: number };

const dateTR = (s: string) => new Date(s).toLocaleDateString("tr-TR");

export default function BulkMaintenancePage() {
  const [form, setForm] = useState({
    year: String(nowD.getFullYear()), month: String(nowD.getMonth() + 1), start_day: "1", holiday_shift: false,
    distribution: "single", strategy: "same", technician_id: "", fee_only: true,
    region_id: "", customer_id: "", building_id: "", elevator_ids: [] as string[],
    type: "periodic", skip_existing: true,
  });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<Created | null>(null);

  const regions = useOptions("/regions");
  const customers = useOptions("/customers");
  const buildings = useOptions("/buildings");
  const elevators = useOptions("/elevators");
  const techs = useOptions("/users?role=technician");

  function set(patch: Partial<typeof form>) { setForm((f) => ({ ...f, ...patch })); setPreview(null); setDone(null); }

  function body(isPreview: boolean) {
    return {
      year: Number(form.year), month: Number(form.month), start_day: Number(form.start_day),
      holiday_shift: form.holiday_shift, distribution: form.distribution, strategy: form.strategy,
      technician_id: form.technician_id ? Number(form.technician_id) : null, fee_only: form.fee_only,
      region_id: form.region_id ? Number(form.region_id) : null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      building_id: form.building_id ? Number(form.building_id) : null,
      elevator_ids: form.elevator_ids.map(Number),
      type: form.type, skip_existing: form.skip_existing, preview: isPreview,
    };
  }

  async function doPreview() {
    setBusy(true); setDone(null);
    try { setPreview(await api<Preview>("/maintenance/bulk", { method: "POST", body: body(true) })); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Önizlenemedi."); }
    finally { setBusy(false); }
  }
  async function doCreate() {
    setBusy(true);
    try { const r = await api<Created>("/maintenance/bulk", { method: "POST", body: body(false) }); setDone(r); setPreview(null); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Oluşturulamadı."); }
    finally { setBusy(false); }
  }

  const needsTech = form.strategy === "same" && !form.technician_id;

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-light text-primary"><CalendarPlus size={20} /></span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Aylık Toplu Bakım Oluştur</h1>
          <p className="text-sm text-muted">Filtre + atama + tarih dağılımını seç, ardından önizlemede ne olacağını gör. Onaylamadığın sürece veritabanına yazılmaz.</p>
        </div>
      </div>

      {done && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 size={20} className="mt-0.5 text-success" />
          <div className="text-sm">
            <div className="font-semibold text-ink">{done.message}</div>
            <div className="mt-1 text-ink-soft">{done.total} asansörden {done.created} tanesi için bakım planlandı{done.skipped > 0 ? `, ${done.skipped} tanesi atlandı (bu ay zaten planlı)` : ""}.</div>
            <Link href="/maintenance" className="mt-2 inline-block font-medium text-primary hover:underline">Bakım Kayıtlarına git →</Link>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {/* 1 Dönem */}
        <Section title="1) Dönem">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Yıl" req><input className="input" type="number" value={form.year} onChange={(e) => set({ year: e.target.value })} /></Field>
            <Field label="Ay" req>
              <select className="input" value={form.month} onChange={(e) => set({ month: e.target.value })}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Başlangıç Günü"><input className="input" type="number" min={1} max={28} value={form.start_day} onChange={(e) => set({ start_day: e.target.value })} /></Field>
          </div>
          <p className="mt-2 text-xs text-muted">“Tek güne yığ” modunda tüm bakımlar bu güne; “Hafta içine yay” modunda bu günden başlayarak iş günlerine eşit dağıtılır. Şubat’a takılmamak için 1–28 ile sınırlıdır.</p>
          <Check className="mt-3" label="Resmî tatil / haftasonu denk gelirse ilk iş gününe kaydır" checked={form.holiday_shift} onChange={(v) => set({ holiday_shift: v })} />
        </Section>

        {/* 2 Tarih dağılımı */}
        <Section title="2) Tarih Dağılımı">
          <Field label="Asansörler hangi günlere düşsün?">
            <select className="input" value={form.distribution} onChange={(e) => set({ distribution: e.target.value })}>
              <option value="single">Hepsi aynı güne (tek gün)</option>
              <option value="weekdays">Hafta içine yay (iş günlerine dağıt)</option>
            </select>
          </Field>
        </Section>

        {/* 3 Teknisyen ataması */}
        <Section title="3) Teknisyen Ataması">
          <Field label="Strateji">
            <select className="input" value={form.strategy} onChange={(e) => set({ strategy: e.target.value })}>
              <option value="same">Hepsine aynı teknisyeni ata (bina varsayılanını yok say)</option>
              <option value="building_default">Bina varsayılanını kullan (yoksa yedek teknisyen)</option>
            </select>
          </Field>
          <p className="mt-2 text-xs text-muted">“Bina varsayılanı”: önce binanın varsayılan teknisyenini kullanır, yoksa aşağıdaki “Yedek Teknisyen”e düşer; o da yoksa atanmamış kalır.</p>
          <div className="mt-3">
            <Field label={form.strategy === "same" ? "Atanacak Teknisyen" : "Yedek Teknisyen"} req={form.strategy === "same"}>
              <select className="input" value={form.technician_id} onChange={(e) => set({ technician_id: e.target.value })}>
                <option value="">— Seçilmedi —</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* 4 Hedef */}
        <Section title="4) Hedef (opsiyonel)">
          <Check label="Sadece bakım ücreti tanımlı asansörler" checked={form.fee_only} onChange={(v) => set({ fee_only: v })} />
          <p className="mt-1 text-xs text-muted">İşaretliyse: Bakım Ücretleri’nde aktif sözleşmesi olmayan asansörler için kayıt YARATILMAZ. Açıkça bedelsiz bakım istiyorsanız kutuyu kaldırın.</p>
          <div className="mt-3 grid gap-4">
            <Field label="Bölge">
              <select className="input" value={form.region_id} onChange={(e) => set({ region_id: e.target.value })}>
                <option value="">Hepsi (filtre yok)</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Müşteri">
              <select className="input" value={form.customer_id} onChange={(e) => set({ customer_id: e.target.value })}>
                <option value="">Hepsi (filtre yok)</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Bina">
              <select className="input" value={form.building_id} onChange={(e) => set({ building_id: e.target.value })}>
                <option value="">Hepsi (filtre yok)</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="Asansörler (boş = filtrelenenlerin hepsi)">
              <select className="input h-28" multiple value={form.elevator_ids}
                onChange={(e) => set({ elevator_ids: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
                {elevators.map((el) => <option key={el.id} value={el.id}>{el.label}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-4 py-3 text-sm text-ink-soft">
          <b className="text-ink">Önizleme:</b> “Önizle” tuşuna bastığında sistem gerçekte hiçbir kayıt açmadan ne olacağını gösterir; teknisyen dağılımını ve atanan asansörleri kontrol ettikten sonra “Onayla ve Oluştur” diyebilirsin.
        </div>

        {needsTech && <p className="text-sm text-danger">“Hepsine aynı teknisyen” stratejisinde atanacak teknisyeni seçin.</p>}

        <div className="flex items-center gap-3">
          <button onClick={doPreview} disabled={busy || needsTech} className="btn-primary"><Eye size={16} /> {busy && !preview ? "Hesaplanıyor…" : "Önizle"}</button>
          <Link href="/maintenance" className="btn-ghost">İptal</Link>
        </div>
      </div>

      {/* Önizleme sonucu */}
      {preview && (
        <div className="pop-in mt-6 rounded-2xl border border-line bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Önizleme</h2>
              <p className="mt-0.5 text-sm text-muted">
                <b className="text-success">{preview.count}</b> asansör için bakım oluşturulacak
                {preview.skipped > 0 ? <> · <b className="text-warning">{preview.skipped}</b> atlanacak (bu ay zaten planlı)</> : null}
                {" "}· toplam {preview.total} asansör tarandı.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="btn-ghost">Düzenle</button>
              <button onClick={doCreate} disabled={busy || preview.count === 0} className="btn-primary">{busy ? "Oluşturuluyor…" : "Onayla ve Oluştur"}</button>
            </div>
          </div>

          {preview.count === 0 ? (
            <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-muted">Filtrelere uyan, oluşturulacak asansör yok.</p>
          ) : (
            <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-2.5 font-medium">Asansör</th>
                    <th className="px-4 py-2.5 font-medium">Bina</th>
                    <th className="px-4 py-2.5 font-medium">Tarih</th>
                    <th className="px-4 py-2.5 font-medium">Teknisyen</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((it) => (
                    <tr key={it.elevator_id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 font-medium text-ink">{it.elevator_name}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{it.building_name}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{dateTR(it.planned_date)}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{it.technician_name || <span className="text-muted">— Atanmamış —</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}
function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}</span>
      {children}
    </label>
  );
}
function Check({ label, checked, onChange, className = "" }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={`flex items-center gap-2.5 text-sm text-ink ${className}`}>
      <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
