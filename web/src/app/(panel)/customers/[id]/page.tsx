"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

type Customer = { id: number; type: string; name: string; phone: string | null; email: string | null;
  city: string | null; district: string | null; address: string | null; tax_number: string | null };
type Building = { id: number; name: string; city: string | null; elevators_count?: number };
type Txn = { id: number; type: string; amount: string; balance_after: string | null; description: string | null; created_at: string };
type AccountResp = { balance: number; transactions: { data: Txn[] } };

const TABS = ["genel", "binalar", "cari"] as const;
const TAB_LABEL: Record<string, string> = { genel: "Genel Bilgiler", binalar: "Binalar", cari: "Cari Hesap" };

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>("genel");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [account, setAccount] = useState<AccountResp | null>(null);

  useEffect(() => { api<Customer>(`/customers/${id}`).then(setCustomer); }, [id]);

  const loadTab = useCallback(() => {
    if (tab === "binalar") api<{ data: Building[] }>(`/buildings?customer_id=${id}`).then((r) => setBuildings(r.data));
    if (tab === "cari") api<AccountResp>(`/current-accounts/${id}`).then(setAccount);
  }, [tab, id]);
  useEffect(() => { loadTab(); }, [loadTab]);

  if (!customer) return <div className="text-muted">Yükleniyor…</div>;

  return (
    <div>
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Müşteriler
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-light text-lg font-bold text-primary">
          {customer.name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">{customer.name}</h1>
          <span className="text-sm text-muted">{customer.type === "corporate" ? "Kurumsal" : "Bireysel"}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted hover:text-ink"}`}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "genel" && (
          <div className="grid max-w-2xl grid-cols-2 gap-4 rounded-xl border border-line bg-card p-5 text-sm">
            <Info label="Telefon" value={customer.phone} />
            <Info label="E-posta" value={customer.email} />
            <Info label="Şehir" value={customer.city} />
            <Info label="İlçe" value={customer.district} />
            <Info label="Vergi No" value={customer.tax_number} />
            <Info label="Adres" value={customer.address} />
          </div>
        )}

        {tab === "binalar" && (
          <div className="overflow-hidden rounded-xl border border-line bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Bina</th><th className="px-4 py-3 font-medium">Şehir</th>
                <th className="px-4 py-3 font-medium text-center">Asansör</th></tr></thead>
              <tbody>
                {buildings.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">Bina yok.</td></tr>
                ) : buildings.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{b.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{b.city ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-ink-soft">{b.elevators_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "cari" && account && (
          <div>
            <div className="mb-4 rounded-xl border border-line bg-card p-5">
              <div className="text-xs uppercase tracking-wide text-muted">Bakiye</div>
              <div className="mt-1 text-2xl font-bold" style={{ color: account.balance > 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                {TRY(account.balance)}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-card">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Tarih</th><th className="px-4 py-3 font-medium">Açıklama</th>
                  <th className="px-4 py-3 font-medium">Tip</th><th className="px-4 py-3 font-medium text-right">Tutar</th></tr></thead>
                <tbody>
                  {account.transactions.data.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Hareket yok.</td></tr>
                  ) : account.transactions.data.map((t) => (
                    <tr key={t.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 text-ink-soft">{dateTR(t.created_at)}</td>
                      <td className="px-4 py-3 text-ink-soft">{t.description ?? "—"}</td>
                      <td className="px-4 py-3">{t.type === "credit" ? "Tahsilat" : "Borç"}</td>
                      <td className="px-4 py-3 text-right font-medium">{TRY(Number(t.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-ink">{value || "—"}</div>
    </div>
  );
}
