"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken, ApiError } from "@/lib/api";
import { dateTR, TRY } from "@/lib/format";
import Badge from "@/components/Badge";
import { ArrowLeft, LogIn, Save, Trash2 } from "lucide-react";

type Tenant = {
  id: number; name: string; slug: string; phone: string | null; email: string | null;
  address: string | null; tax_number: string | null; tax_office: string | null;
  plan: string; plan_expires_at: string | null; sms_balance: number; is_active: boolean;
  created_at: string; updated_at: string;
};
type TUser = { id: number; name: string | null; surname: string | null; phone: string | null; role: string; is_active: boolean; last_login_at: string | null };
type TPayment = { id: number; amount: number; currency: string; status: string; paid_at: string | null; created_at: string };

const PLAN: Record<string, string> = { trial: "Deneme", starter: "Başlangıç", pro: "Pro", enterprise: "Kurumsal" };
const ROLE: Record<string, string> = { manager: "Yönetici", technician: "Teknisyen", accounting: "Muhasebe", staff: "Personel" };

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [t, setT] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<TUser[]>([]);
  const [payments, setPayments] = useState<TPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("trial");
  const [expires, setExpires] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Tenant>(`/admin/tenants/${id}`, { admin: true }),
      api<TUser[]>(`/admin/tenants/${id}/users`, { admin: true }).catch(() => []),
      api<TPayment[]>(`/admin/tenants/${id}/payments`, { admin: true }).catch(() => []),
    ])
      .then(([d, u, p]) => {
        setT(d); setPlan(d.plan); setActive(d.is_active); setExpires(d.plan_expires_at?.slice(0, 10) ?? "");
        setUsers(u); setPayments(p);
      })
      .catch(() => router.replace("/admin/tenants"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function remove() {
    if (!t || !confirm(`"${t.name}" firması silinecek (soft-delete). Devam?`)) return;
    try {
      await api(`/admin/tenants/${id}`, { method: "DELETE", admin: true });
      router.replace("/admin/tenants");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Silinemedi.");
    }
  }

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await api(`/admin/tenants/${id}`, { method: "PUT", admin: true, body: {
        plan, is_active: active, plan_expires_at: expires || null,
      } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function impersonate() {
    if (!t || !confirm(`${t.name} firmasına yönetici olarak giriş yapılacak. Devam?`)) return;
    try {
      const res = await api<{ token: string }>(`/admin/tenants/${id}/impersonate`, { method: "POST", admin: true });
      setToken(res.token);
      window.location.href = "/dashboard";
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Giriş yapılamadı.");
    }
  }

  if (loading) return <div className="grid place-items-center py-20 text-muted">Yükleniyor…</div>;
  if (!t) return null;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/tenants" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft size={15} /> Firmalar
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t.name}</h1>
          <p className="mt-1 text-sm text-muted">/{t.slug} · Kayıt: {dateTR(t.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10">
            <Trash2 size={15} /> Sil
          </button>
          <button onClick={impersonate} className="btn-primary"><LogIn size={16} /> Firma Adına Giriş</button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Düzenlenebilir: Abonelik */}
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Abonelik</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Plan</span>
              <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
                {Object.entries(PLAN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Plan Bitiş Tarihi</span>
              <input type="date" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
              <span className="text-sm text-ink-soft">Firma aktif</span>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
            </label>
            <div className="flex items-center gap-3">
              <button onClick={save} disabled={saving} className="btn-primary"><Save size={15} /> {saving ? "Kaydediliyor…" : "Kaydet"}</button>
              {saved && <span className="text-sm text-success">Kaydedildi ✓</span>}
            </div>
          </div>
        </div>

        {/* Salt-okunur: Firma bilgileri */}
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Firma Bilgileri</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Info label="Telefon" value={t.phone} />
            <Info label="E-posta" value={t.email} />
            <Info label="Vergi No" value={t.tax_number} />
            <Info label="Vergi Dairesi" value={t.tax_office} />
            <Info label="Adres" value={t.address} />
          </dl>
        </div>
      </div>

      {/* Kullanıcılar */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Kullanıcılar ({users.length})</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-2.5 font-medium">Ad</th>
              <th className="px-4 py-2.5 font-medium">Telefon</th>
              <th className="px-4 py-2.5 font-medium">Rol</th>
              <th className="px-4 py-2.5 font-medium">Son Giriş</th>
              <th className="px-4 py-2.5 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-muted">Kullanıcı yok.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5 font-medium text-ink">{[u.name, u.surname].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-4 py-2.5 text-ink-soft">{u.phone ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-soft">{ROLE[u.role] ?? u.role}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{u.last_login_at ? dateTR(u.last_login_at) : "Hiç"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    {u.is_active ? "Aktif" : "Pasif"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ödeme geçmişi */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Abonelik Ödemeleri ({payments.length})</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-2.5 font-medium">Tarih</th>
              <th className="px-4 py-2.5 font-medium text-right">Tutar</th>
              <th className="px-4 py-2.5 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-6 text-center text-muted">Ödeme kaydı yok.</td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5 text-ink-soft">{dateTR(p.paid_at ?? p.created_at)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{TRY(p.amount)}</td>
                <td className="px-4 py-2.5"><Badge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink-soft">{value || "—"}</dd>
    </div>
  );
}
