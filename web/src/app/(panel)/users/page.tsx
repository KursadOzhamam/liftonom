"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";

type Row = {
  id: number;
  name: string;
  surname: string | null;
  phone: string;
  email: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const ROLE: Record<string, string> = {
  manager: "Yönetici", office: "Ofis", technician: "Teknisyen",
  accounting: "Muhasebe", viewer: "Görüntüleme",
};

export default function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/users")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Personel</h1>
      <p className="mt-1 text-sm text-muted">{total} kullanıcı</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ad Soyad</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Son Giriş</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{u.name} {u.surname}</td>
                  <td className="px-4 py-3 text-ink-soft">{ROLE[u.role] ?? u.role}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? "bg-success/10 text-success" : "bg-surface text-muted"
                    }`}>{u.is_active ? "Aktif" : "Pasif"}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(u.last_login_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
