"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TRY } from "@/lib/format";
import { Wallet, Landmark, Banknote, ArrowDownLeft, ArrowUpRight } from "lucide-react";

type Summary = {
  total_balance: number; cash_total: number; bank_total: number;
  today: { in: number; out: number };
  this_month: { in: number; out: number };
};
type Monthly = { month: string; income: number; expense: number };

export default function FinancePage() {
  const [s, setS] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Summary>("/finance/summary"),
      api<Monthly[]>("/finance/monthly"),
    ])
      .then(([sum, mon]) => { setS(sum); setMonthly(mon); })
      .finally(() => setLoading(false));
  }, []);

  const maxVal = Math.max(1, ...monthly.flatMap((m) => [m.income, m.expense]));

  if (loading) return <div className="grid place-items-center py-20 text-muted">Yükleniyor…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Finansal Özet</h1>
      <p className="mt-1 text-sm text-muted">Kasa & banka bakiyeleri ve aylık gelir/gider akışı.</p>

      {/* Bakiye kartları */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat icon={<Wallet size={18} />} label="Toplam Bakiye" value={TRY(s?.total_balance ?? 0)} accent />
        <Stat icon={<Banknote size={18} />} label="Nakit (Kasa)" value={TRY(s?.cash_total ?? 0)} />
        <Stat icon={<Landmark size={18} />} label="Banka" value={TRY(s?.bank_total ?? 0)} />
      </div>

      {/* Bugün / Bu ay */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Flow title="Bugün" inv={s?.today.in ?? 0} out={s?.today.out ?? 0} />
        <Flow title="Bu Ay" inv={s?.this_month.in ?? 0} out={s?.this_month.out ?? 0} />
      </div>

      {/* Aylık grafik */}
      <div className="mt-6 rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Son 12 Ay — Gelir / Gider</h2>
        {monthly.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">Henüz hareket yok.</p>
        ) : (
          <div className="mt-5 flex items-end gap-3 overflow-x-auto pb-2">
            {monthly.map((m) => (
              <div key={m.month} className="flex min-w-12 flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div className="w-1/2 rounded-t bg-success/80" style={{ height: `${(m.income / maxVal) * 100}%` }} title={`Gelir: ${TRY(m.income)}`} />
                  <div className="w-1/2 rounded-t bg-danger/80" style={{ height: `${(m.expense / maxVal) * 100}%` }} title={`Gider: ${TRY(m.expense)}`} />
                </div>
                <span className="text-[10px] text-muted">{m.month.slice(2)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success/80" /> Gelir</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger/80" /> Gider</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-line p-5 ${accent ? "bg-primary text-white" : "bg-card"}`}>
      <div className={`flex items-center gap-2 text-xs font-medium ${accent ? "text-white/80" : "text-muted"}`}>
        {icon} {label}
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-white" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function Flow({ title, inv, out }: { title: string; inv: number; out: number }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="text-xs font-medium text-muted">{title}</div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success"><ArrowDownLeft size={18} /></div>
          <div>
            <div className="text-[11px] text-muted">Giriş</div>
            <div className="font-semibold tabular-nums text-success">{TRY(inv)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-danger/10 text-danger"><ArrowUpRight size={18} /></div>
          <div>
            <div className="text-[11px] text-muted">Çıkış</div>
            <div className="font-semibold tabular-nums text-danger">{TRY(out)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
