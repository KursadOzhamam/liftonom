"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { User, Building2, ArrowUpDown, Check, Rocket, Plus, Trash2, Wrench } from "lucide-react";

type Elev = { name: string; brand: string; model: string; stop: string; capacity: string; tse: string };
const emptyElev: Elev = { name: "", brand: "", model: "", stop: "", capacity: "", tse: "" };
const BUILDING_TYPES = ["Apartman", "Site", "Plaza", "İş Merkezi", "Villa", "Hastane", "AVM", "Diğer"];

const numOrNull = (s: string) => (s.trim() ? Number(s) : null);
const strOrNull = (s: string) => (s.trim() ? s.trim() : null);

export default function QuickSetupPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ customer: string; building: string; elevators: number } | null>(null);

  const [customer, setCustomer] = useState({
    name: "", type: "corporate", email: "", phone: "", authorized_person: "", tax_number: "", tax_office: "", address: "",
  });
  const [building, setBuilding] = useState({
    name: "", type: "Apartman", city: "", district: "", address: "", floor: "", units: "", manager: "", manager_phone: "",
  });
  const [elevators, setElevators] = useState<Elev[]>([{ ...emptyElev }]);
  const [fee, setFee] = useState({ amount: "", from: "", to: "" });

  function setElev(i: number, patch: Partial<Elev>) {
    setElevators((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const c = await api<{ id: number }>("/customers", {
        method: "POST",
        body: {
          type: customer.type, name: customer.name,
          authorized_person: strOrNull(customer.authorized_person),
          email: strOrNull(customer.email), phone: strOrNull(customer.phone),
          tax_number: strOrNull(customer.tax_number), tax_office: strOrNull(customer.tax_office),
          address: strOrNull(customer.address),
        },
      });

      let buildingId: number | null = null;
      if (building.name.trim()) {
        const b = await api<{ id: number }>("/buildings", {
          method: "POST",
          body: {
            customer_id: c.id, name: building.name, type: building.type,
            city: strOrNull(building.city), district: strOrNull(building.district), address: strOrNull(building.address),
            floor_count: numOrNull(building.floor), unit_count: numOrNull(building.units),
            manager_name: strOrNull(building.manager), manager_phone: strOrNull(building.manager_phone),
          },
        });
        buildingId = b.id;
      }

      const toCreate = elevators.filter((e) => e.name.trim());
      for (const e of toCreate) {
        await api("/elevators", {
          method: "POST",
          body: {
            building_id: buildingId, name: e.name, brand: strOrNull(e.brand), model: strOrNull(e.model),
            stop_count: numOrNull(e.stop), capacity_kg: numOrNull(e.capacity), tse_end_date: strOrNull(e.tse),
          },
        });
      }

      if (fee.amount.trim() && Number(fee.amount) > 0) {
        await api("/maintenance-fees", {
          method: "POST",
          body: {
            customer_id: c.id, building_id: buildingId, amount: Number(fee.amount),
            period: "monthly", valid_from: strOrNull(fee.from), valid_to: strOrNull(fee.to),
          },
        });
      }

      setDone({ customer: customer.name, building: building.name, elevators: toCreate.length });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCustomer({ name: "", type: "corporate", email: "", phone: "", authorized_person: "", tax_number: "", tax_office: "", address: "" });
    setBuilding({ name: "", type: "Apartman", city: "", district: "", address: "", floor: "", units: "", manager: "", manager_phone: "" });
    setElevators([{ ...emptyElev }]);
    setFee({ amount: "", from: "", to: "" });
    setError(null);
    setDone(null);
  }

  if (done) {
    return (
      <div className="max-w-3xl">
        <div className="pop-in grid place-items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-success text-white"><Check size={28} /></div>
          <h1 className="text-xl font-bold text-ink">Kurulum tamamlandı! 🎉</h1>
          <p className="text-sm text-ink-soft">
            <strong>{done.customer}</strong> müşterisi{done.building ? <>, <strong>{done.building}</strong> binası</> : null}
            {done.elevators > 0 ? <> ve <strong>{done.elevators} asansör</strong></> : null} oluşturuldu.
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={reset} className="btn-ghost">Yeni Kurulum</button>
            <Link href="/elevators" className="btn-primary">Asansörlere Git</Link>
          </div>
        </div>
      </div>
    );
  }

  const valid = customer.name.trim() && customer.phone.trim();

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-light text-primary"><Rocket size={20} /></span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Hızlı Müşteri + Bina + Asansör Kurulumu</h1>
          <p className="text-sm text-muted">Tek formdan müşteri, bina, asansörler ve bakım ücretini bir kerede ekleyin.</p>
        </div>
      </div>

      {error && <div className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="mt-6 space-y-4">
        {/* 1 · Müşteri */}
        <Section n={1} icon={User} title="Müşteri Bilgileri">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad / Ünvan" req>
              <input className="input" placeholder="Atlas Apt. Yönetimi" value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            </Field>
            <Field label="Tip">
              <select className="input" value={customer.type} onChange={(e) => setCustomer({ ...customer, type: e.target.value })}>
                <option value="corporate">Kurumsal (Apartman/Site Yönetimi)</option>
                <option value="individual">Bireysel</option>
              </select>
            </Field>
            <Field label="E-posta" hint="opsiyonel">
              <input className="input" type="email" placeholder="info@apt.com" value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            </Field>
            <Field label="Cep Telefonu" req>
              <Phone value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
            </Field>
            <Field label="Yetkili Kişi" hint="opsiyonel">
              <input className="input" placeholder="Ahmet Yılmaz (Yönetici)" value={customer.authorized_person}
                onChange={(e) => setCustomer({ ...customer, authorized_person: e.target.value })} />
            </Field>
            <Field label="Vergi No / TCKN">
              <input className="input" value={customer.tax_number} onChange={(e) => setCustomer({ ...customer, tax_number: e.target.value })} />
            </Field>
            <Field label="Vergi Dairesi">
              <input className="input" value={customer.tax_office} onChange={(e) => setCustomer({ ...customer, tax_office: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Adres">
                <textarea className="input min-h-20" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              </Field>
            </div>
          </div>
        </Section>

        {/* 2 · Bina */}
        <Section n={2} icon={Building2} title="Bina Bilgileri" hint="opsiyonel">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bina Adı">
              <input className="input" placeholder="Atlas Apartmanı" value={building.name}
                onChange={(e) => setBuilding({ ...building, name: e.target.value })} />
            </Field>
            <Field label="Tip">
              <select className="input" value={building.type} onChange={(e) => setBuilding({ ...building, type: e.target.value })}>
                {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Şehir">
              <input className="input" value={building.city} onChange={(e) => setBuilding({ ...building, city: e.target.value })} />
            </Field>
            <Field label="İlçe">
              <input className="input" value={building.district} onChange={(e) => setBuilding({ ...building, district: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Adres">
                <textarea className="input min-h-20" value={building.address} onChange={(e) => setBuilding({ ...building, address: e.target.value })} />
              </Field>
            </div>
            <Field label="Kat Sayısı">
              <input className="input" type="number" value={building.floor} onChange={(e) => setBuilding({ ...building, floor: e.target.value })} />
            </Field>
            <Field label="Daire Sayısı">
              <input className="input" type="number" value={building.units} onChange={(e) => setBuilding({ ...building, units: e.target.value })} />
            </Field>
            <Field label="Bina Yöneticisi (Adı)">
              <input className="input" value={building.manager} onChange={(e) => setBuilding({ ...building, manager: e.target.value })} />
            </Field>
            <Field label="Yönetici Telefon">
              <Phone value={building.manager_phone} onChange={(v) => setBuilding({ ...building, manager_phone: v })} />
            </Field>
          </div>
        </Section>

        {/* 3 · Asansörler */}
        <Section n={3} icon={ArrowUpDown} title="Asansörler" hint="opsiyonel — birden fazla ekleyebilirsiniz">
          <div className="space-y-3">
            {elevators.map((e, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface/60 p-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <MiniField label="Asansör Adı"><input className="input" placeholder={`Asansör ${i + 1}`} value={e.name} onChange={(ev) => setElev(i, { name: ev.target.value })} /></MiniField>
                  <MiniField label="Marka"><input className="input" value={e.brand} onChange={(ev) => setElev(i, { brand: ev.target.value })} /></MiniField>
                  <MiniField label="Model"><input className="input" value={e.model} onChange={(ev) => setElev(i, { model: ev.target.value })} /></MiniField>
                  <MiniField label="Durak"><input className="input" type="number" value={e.stop} onChange={(ev) => setElev(i, { stop: ev.target.value })} /></MiniField>
                  <MiniField label="Kapasite (kg)"><input className="input" type="number" value={e.capacity} onChange={(ev) => setElev(i, { capacity: ev.target.value })} /></MiniField>
                  <MiniField label="TSE Vade"><input className="input" type="date" value={e.tse} onChange={(ev) => setElev(i, { tse: ev.target.value })} /></MiniField>
                </div>
                {elevators.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => setElevators((l) => l.filter((_, idx) => idx !== i))} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-danger">
                      <Trash2 size={13} /> Kaldır
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => setElevators((l) => [...l, { ...emptyElev }])} className="btn-ghost text-sm">
              <Plus size={15} /> Bir asansör daha ekle
            </button>
          </div>
        </Section>

        {/* 4 · Bakım ücreti */}
        <Section n={4} icon={Wrench} title="Bakım Ücreti" hint="opsiyonel — eklenen tüm asansörler için uygulanır">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Aylık Ücret (₺, KDV Dahil)" hint="KDV dahil tutar girin">
              <input className="input" type="number" placeholder="1500" value={fee.amount} onChange={(e) => setFee({ ...fee, amount: e.target.value })} />
            </Field>
            <Field label="Başlangıç">
              <input className="input" type="date" value={fee.from} onChange={(e) => setFee({ ...fee, from: e.target.value })} />
            </Field>
            <Field label="Bitiş">
              <input className="input" type="date" value={fee.to} onChange={(e) => setFee({ ...fee, to: e.target.value })} />
            </Field>
          </div>
        </Section>
      </div>

      {/* Sabit alt bar */}
      <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-end gap-3 border-t border-line bg-surface/80 py-4 backdrop-blur-md">
        <button onClick={() => router.push("/dashboard")} className="btn-ghost">İptal</button>
        <button onClick={submit} disabled={saving || !valid} className="btn-primary">
          {saving ? "Kuruluyor…" : <>Tek Tıkla Kur <Check size={16} /></>}
        </button>
      </div>
    </div>
  );
}

/* ---------- yardımcılar ---------- */
function Section({ n, icon: Icon, title, hint, children }: {
  n: number; icon: typeof User; title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-light text-primary"><Icon size={18} /></span>
        <h2 className="text-base font-semibold text-ink">
          <span className="text-muted">{n}.</span> {title}
          {hint && <span className="ml-1.5 text-sm font-normal text-muted">({hint})</span>}
        </h2>
      </div>
      {children}
    </div>
  );
}
function Field({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}{req && <span className="text-danger"> *</span>}{hint && <span className="font-normal text-muted"> ({hint})</span>}
      </span>
      {children}
    </label>
  );
}
function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
function Phone({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex">
      <span className="inline-flex items-center rounded-l-[10px] border border-r-0 border-line bg-surface px-3 text-sm text-muted">+90</span>
      <input className="input rounded-l-none" placeholder="5XX XXX XX XX" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
