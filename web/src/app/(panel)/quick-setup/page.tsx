"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { User, Building2, ArrowUpDown, Check, Rocket } from "lucide-react";

export default function QuickSetupPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ name: "", authorized_person: "", phone: "", type: "corporate" });
  const [building, setBuilding] = useState({ name: "", address: "" });
  const [elevator, setElevator] = useState({ name: "", capacity_kg: "" });
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const c = await api<{ id: number }>("/customers", {
        method: "POST",
        body: {
          type: customer.type,
          name: customer.name,
          authorized_person: customer.authorized_person || null,
          phone: customer.phone || null,
        },
      });
      const b = await api<{ id: number }>("/buildings", {
        method: "POST",
        body: { customer_id: c.id, name: building.name, address: building.address || null },
      });
      await api("/elevators", {
        method: "POST",
        body: { building_id: b.id, name: elevator.name, capacity_kg: elevator.capacity_kg ? Number(elevator.capacity_kg) : null },
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCustomer({ name: "", authorized_person: "", phone: "", type: "corporate" });
    setBuilding({ name: "", address: "" });
    setElevator({ name: "", capacity_kg: "" });
    setError(null);
    setDone(false);
  }

  if (done) {
    return (
      <div className="max-w-2xl">
        <div className="pop-in grid place-items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-success text-white"><Check size={28} /></div>
          <h1 className="text-xl font-bold text-ink">Kurulum tamamlandı! 🎉</h1>
          <p className="text-sm text-ink-soft">
            <strong>{customer.name}</strong> müşterisi, <strong>{building.name}</strong> binası ve <strong>{elevator.name}</strong> asansörü oluşturuldu.
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={reset} className="btn-ghost">Yeni Kurulum</button>
            <Link href="/elevators" className="btn-primary">Asansörlere Git</Link>
          </div>
        </div>
      </div>
    );
  }

  const valid = customer.name.trim() && building.name.trim() && elevator.name.trim();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-light text-primary"><Rocket size={20} /></span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Hızlı Kurulum</h1>
          <p className="text-sm text-muted">Müşteri, bina ve asansörü tek ekranda ekleyin.</p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="mt-6 space-y-4">
        {/* 1 · Müşteri */}
        <Section step={1} icon={User} title="Müşteri" subtitle="Site / firma bilgisi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tip">
              <select className="input" value={customer.type} onChange={(e) => setCustomer({ ...customer, type: e.target.value })}>
                <option value="corporate">Kurumsal</option>
                <option value="individual">Bireysel</option>
              </select>
            </Field>
            <Field label="Ad / Ünvan (Site adı) *">
              <input className="input" placeholder="Örn. Yeşil Vadi Sitesi" value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            </Field>
            <Field label="Yetkili Kişi">
              <input className="input" placeholder="Örn. Ahmet Yılmaz (Yönetici)" value={customer.authorized_person}
                onChange={(e) => setCustomer({ ...customer, authorized_person: e.target.value })} />
            </Field>
            <Field label="Telefon">
              <input className="input" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </Field>
          </div>
        </Section>

        {/* 2 · Bina */}
        <Section step={2} icon={Building2} title="Bina" subtitle="Adres bilgisi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bina Adı *">
              <input className="input" placeholder="Örn. A Blok" value={building.name}
                onChange={(e) => setBuilding({ ...building, name: e.target.value })} />
            </Field>
            <Field label="Adres">
              <input className="input" value={building.address} onChange={(e) => setBuilding({ ...building, address: e.target.value })} />
            </Field>
          </div>
        </Section>

        {/* 3 · Asansör */}
        <Section step={3} icon={ArrowUpDown} title="Asansör" subtitle="Cihaz bilgisi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Asansör Adı *">
              <input className="input" placeholder="Örn. 1 No'lu Asansör" value={elevator.name}
                onChange={(e) => setElevator({ ...elevator, name: e.target.value })} />
            </Field>
            <Field label="Kapasite (kg)">
              <input className="input" type="number" value={elevator.capacity_kg}
                onChange={(e) => setElevator({ ...elevator, capacity_kg: e.target.value })} />
            </Field>
          </div>
        </Section>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={submit} disabled={saving || !valid} className="btn-primary">
          {saving ? "Kaydediliyor…" : "Hepsini Kaydet"}
        </button>
      </div>
    </div>
  );
}

function Section({ step, icon: Icon, title, subtitle, children }: {
  step: number; icon: typeof User; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-light text-primary"><Icon size={18} /></span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink"><span className="text-muted">{step}.</span> {title}</div>
          <div className="text-xs text-muted">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
