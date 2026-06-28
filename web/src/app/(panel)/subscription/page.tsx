"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import { Check, Crown } from "lucide-react";

type Current = { plan: string; plan_expires_at: string | null; status: string };
type Plan = { id: number; code: string; name: string; monthly_price: string; max_users: number | null; max_elevators: number | null; sms_quota: number | null };

const STATUS: Record<string, string> = { trialing: "Deneme", active: "Aktif", past_due: "Gecikmiş", cancelled: "İptal", expired: "Süresi Doldu" };

export default function SubscriptionPage() {
  const [current, setCurrent] = useState<Current | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([api<Current>("/subscription"), api<Plan[]>("/subscription/plans")]);
    setCurrent(c); setPlans(p);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upgrade(plan: Plan) {
    const price = Number(plan.monthly_price);
    const msg = price > 0
      ? `${plan.name} planına geçilecek. ${TRY(price)}/ay tahsil edilecek. Devam?`
      : `${plan.name} planına geçilecek. Devam?`;
    if (!confirm(msg)) return;
    setBusy(plan.code);
    try {
      await api("/subscription/upgrade", { method: "POST", body: { plan: plan.code } });
      await load();
      alert(`${plan.name} planına yükseltildi.`);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Yükseltme başarısız.");
    } finally { setBusy(null); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Abonelik</h1>
      <p className="mt-1 text-sm text-muted">Planınızı yönetin ve yükseltin.</p>

      {current && (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5">
          <Crown size={28} className="text-warning" />
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Mevcut Plan</div>
            <div className="mt-0.5 text-lg font-bold text-ink">
              {plans.find((p) => p.code === current.plan)?.name ?? current.plan}
            </div>
          </div>
          <div className="border-l border-line pl-4">
            <div className="text-xs uppercase tracking-wide text-muted">Durum</div>
            <div className="mt-0.5 font-semibold text-ink">{STATUS[current.status] ?? current.status}</div>
          </div>
          <div className="border-l border-line pl-4">
            <div className="text-xs uppercase tracking-wide text-muted">Bitiş</div>
            <div className="mt-0.5 font-semibold text-ink">{dateTR(current.plan_expires_at)}</div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = current?.plan === p.code;
          const price = Number(p.monthly_price);
          return (
            <div key={p.id} className={`rounded-xl border bg-white p-5 ${isCurrent ? "border-primary ring-1 ring-primary" : "border-line"}`}>
              <div className="text-lg font-bold text-ink">{p.name}</div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {price > 0 ? TRY(price) : "Özel"}
                {price > 0 && <span className="text-sm font-normal text-muted">/ay</span>}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                <Feature ok>{p.max_users == null ? "Sınırsız" : p.max_users} kullanıcı</Feature>
                <Feature ok>{p.max_elevators == null ? "Sınırsız" : p.max_elevators} asansör</Feature>
                <Feature ok>{p.sms_quota == null ? "Sınırsız" : p.sms_quota} SMS</Feature>
              </ul>
              <button
                onClick={() => upgrade(p)}
                disabled={isCurrent || busy === p.code}
                className={`mt-5 w-full rounded-lg px-4 py-2 text-sm font-medium ${
                  isCurrent ? "bg-surface text-muted" : "btn-primary"
                }`}
              >
                {isCurrent ? "Mevcut Plan" : busy === p.code ? "İşleniyor…" : "Bu Plana Geç"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">Ödemeler güvenli şekilde işlenir. (Test ortamında mock ödeme kullanılır.)</p>
    </div>
  );
}

function Feature({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check size={15} className={ok ? "text-success" : "text-muted"} />
      {children}
    </li>
  );
}
