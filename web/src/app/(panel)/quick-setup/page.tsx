"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { User, Building2, ArrowUpDown, Check, Rocket } from "lucide-react";

const STEPS = [
  { n: 1, label: "Müşteri", icon: User },
  { n: 2, label: "Bina", icon: Building2 },
  { n: 3, label: "Asansör", icon: ArrowUpDown },
];

export default function QuickSetupPage() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", type: "individual" });
  const [building, setBuilding] = useState({ name: "", address: "" });
  const [elevator, setElevator] = useState({ name: "", capacity_kg: "" });
  const [ids, setIds] = useState<{ customer?: number; building?: number; elevator?: number }>({});
  const [done, setDone] = useState(false);

  async function next() {
    setSaving(true);
    try {
      if (step === 1) {
        const r = await api<{ id: number }>("/customers", { method: "POST", body: { name: customer.name, phone: customer.phone || null, type: customer.type } });
        setIds((s) => ({ ...s, customer: r.id })); setStep(2);
      } else if (step === 2) {
        const r = await api<{ id: number }>("/buildings", { method: "POST", body: { customer_id: ids.customer, name: building.name, address: building.address || null } });
        setIds((s) => ({ ...s, building: r.id })); setStep(3);
      } else {
        const r = await api<{ id: number }>("/elevators", { method: "POST", body: { building_id: ids.building, name: elevator.name, capacity_kg: elevator.capacity_kg ? Number(elevator.capacity_kg) : null } });
        setIds((s) => ({ ...s, elevator: r.id })); setDone(true);
      }
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); } finally { setSaving(false); }
  }

  function reset() { setStep(1); setCustomer({ name: "", phone: "", type: "individual" }); setBuilding({ name: "", address: "" }); setElevator({ name: "", capacity_kg: "" }); setIds({}); setDone(false); }

  if (done) {
    return (
      <div className="max-w-xl">
        <div className="grid place-items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-success text-white"><Check size={28} /></div>
          <h1 className="text-xl font-bold text-ink">Kurulum tamamlandı! 🎉</h1>
          <p className="text-sm text-ink-soft"><strong>{customer.name}</strong> müşterisi, <strong>{building.name}</strong> binası ve <strong>{elevator.name}</strong> asansörü oluşturuldu.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={reset} className="rounded-lg border border-line px-4 py-2 text-sm">Yeni Kurulum</button>
            <Link href={`/elevators`} className="btn-primary">Asansörlere Git</Link>
          </div>
        </div>
      </div>
    );
  }

  const canNext = step === 1 ? customer.name : step === 2 ? building.name : elevator.name;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Rocket size={18} /></div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Hızlı Kurulum</h1>
          <p className="text-sm text-muted">Müşteri, bina ve asansörü tek akışta ekle.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-6 flex items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.n, complete = step > s.n;
          return (
            <div key={s.n} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`grid h-10 w-10 place-items-center rounded-full border-2 ${complete ? "border-success bg-success text-white" : active ? "border-primary bg-primary text-white" : "border-line bg-card text-muted"}`}>
                  {complete ? <Check size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-xs ${active ? "font-medium text-ink" : "text-muted"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 mb-5 h-0.5 flex-1 ${step > s.n ? "bg-success" : "bg-line"}`} />}
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-4 rounded-xl border border-line bg-card p-6">
        {step === 1 && (
          <>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Müşteri Adı *</span><input className="input" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Telefon</span><input className="input" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Tip</span>
              <select className="input" value={customer.type} onChange={(e) => setCustomer({ ...customer, type: e.target.value })}>
                <option value="individual">Bireysel</option><option value="corporate">Kurumsal</option>
              </select>
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <div className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">Müşteri: <span className="font-medium text-ink-soft">{customer.name}</span></div>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Bina Adı *</span><input className="input" value={building.name} onChange={(e) => setBuilding({ ...building, name: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Adres</span><textarea className="input min-h-16" value={building.address} onChange={(e) => setBuilding({ ...building, address: e.target.value })} /></label>
          </>
        )}
        {step === 3 && (
          <>
            <div className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">Bina: <span className="font-medium text-ink-soft">{building.name}</span></div>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Asansör Adı *</span><input className="input" value={elevator.name} onChange={(e) => setElevator({ ...elevator, name: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Kapasite (kg)</span><input className="input" type="number" value={elevator.capacity_kg} onChange={(e) => setElevator({ ...elevator, capacity_kg: e.target.value })} /></label>
          </>
        )}

        <div className="flex justify-between pt-2">
          {step > 1 ? <button onClick={() => setStep(step - 1)} className="rounded-lg border border-line px-4 py-2 text-sm">Geri</button> : <span />}
          <button onClick={next} disabled={saving || !canNext} className="btn-primary">
            {saving ? "Kaydediliyor…" : step === 3 ? "Tamamla" : "Devam"}
          </button>
        </div>
      </div>
    </div>
  );
}
