"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, downloadFile } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useConfirm } from "@/components/ConfirmDialog";
import Badge from "@/components/Badge";
import { Plus, Eye, Send, FileDown, Pencil, Trash2, Star } from "lucide-react";

type Row = {
  id: number; quote_number: string | null; type: string | null; status: string;
  total: number | null; currency: string | null; valid_until: string | null; created_at: string;
  title: string | null; customer_name: string | null; template_name: string | null;
};
type Tpl = { id: number; name: string; type: string; is_default: boolean; is_active: boolean; clause_count: number };

const STATUSES = [
  { v: "draft", l: "Taslak" }, { v: "sent", l: "Gönderildi" },
  { v: "approved", l: "Onaylandı" }, { v: "rejected", l: "Reddedildi" },
];
const fmt = (n: number | null, cur?: string | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${cur ?? "TRY"}`;

export default function QuotesPage() {
  const [tab, setTab] = useState<"docs" | "templates">("docs");
  const [tplCount, setTplCount] = useState(0);

  const loadTplCount = useCallback(async () => {
    try { const r = await api<{ data: Tpl[] }>("/quotes/templates"); setTplCount(r.data.length); } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadTplCount(); }, [loadTplCount]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{tab === "docs" ? "Teklifler" : "Teklif Şablonları"}</h1>

      <div className="mt-4 flex w-fit gap-1 rounded-xl border border-line bg-surface p-1">
        <button onClick={() => setTab("docs")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "docs" ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
          Belgeler
        </button>
        <button onClick={() => setTab("templates")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "templates" ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
          Şablonlar
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">{tplCount}</span>
        </button>
      </div>

      <div className="mt-5">{tab === "docs" ? <DocsTab /> : <TemplatesTab onChange={loadTplCount} />}</div>
    </div>
  );
}

function DocsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set("search", search.trim());
      if (status) p.set("status", status);
      if (sort) p.set("sort", sort);
      p.set("type", "standard"); p.set("per_page", "50");
      const r = await api<{ data: Row[]; meta: { total: number } }>(`/quotes?${p}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [search, status, sort]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function del(id: number) {
    if (!(await confirm("Bu teklif silinsin mi?", { danger: true }))) return;
    await api(`/quotes/${id}`, { method: "DELETE" }); load();
  }

  function exportCsv() {
    const head = ["No", "Müşteri", "Tarih", "Geçerlilik", "Tutar", "Durum"];
    const lines = rows.map((r) => [
      r.quote_number ?? r.id, r.customer_name ?? "", dateTR(r.created_at), dateTR(r.valid_until),
      fmt(r.total, r.currency), STATUSES.find((s) => s.v === r.status)?.l ?? r.status,
    ].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"));
    const csv = [head.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "teklifler.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <input className="input" placeholder="Teklif no, müşteri…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Sel label="Durum" value={status} onChange={setStatus} opts={[{ v: "", l: "Tüm Durumlar" }, ...STATUSES]} />
        <Sel label="Sırala" value={sort} onChange={setSort} opts={[
          { v: "", l: "En yeni tarih" }, { v: "valid_asc", l: "Geçerliliğe göre" },
          { v: "amount_desc", l: "Tutar (çok→az)" }, { v: "amount_asc", l: "Tutar (az→çok)" },
        ]} />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={exportCsv} className="btn-ghost"><FileDown size={15} /> Excel'e Aktar (CSV)</button>
        <Link href="/quotes/new" className="btn-primary"><Plus size={16} /> Yeni</Link>
      </div>

      <p className="mt-4 text-sm text-muted"><b className="text-ink">{total}</b> kayıt</p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">No</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Geçerlilik</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Henüz teklif yok.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{r.quote_number ?? `#${r.id}`}</td>
                <td className="px-4 py-3 font-medium text-ink">{r.customer_name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{dateTR(r.created_at)}</td>
                <td className="px-4 py-3 text-ink-soft">{dateTR(r.valid_until)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{fmt(r.total, r.currency)}</td>
                <td className="px-4 py-3"><Badge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/quotes/${r.id}/preview`} className="btn-primary px-2.5 py-1.5 text-xs"><Eye size={14} /> Önizle</Link>
                    <Link href={`/quotes/${r.id}/preview?send=1`} className="btn-ghost px-2.5 py-1.5 text-xs"><Send size={14} /> Gönder</Link>
                    <button onClick={() => downloadFile(`/quotes/${r.id}/pdf`, `${r.quote_number ?? `teklif-${r.id}`}.pdf`)} className="btn-ghost px-2.5 py-1.5 text-xs" title="PDF"><FileDown size={14} /></button>
                    <Link href={`/quotes/${r.id}/edit`} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil size={14} /> Düzenle</Link>
                    <button onClick={() => del(r.id)} className="btn-danger px-2.5 py-1.5 text-xs"><Trash2 size={14} /> Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatesTab({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const confirm = useConfirm();
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set("search", search.trim());
      p.set("sort", sort);
      const r = await api<{ data: Tpl[] }>(`/quotes/templates?${p}`);
      setRows(r.data);
    } finally { setLoading(false); }
  }, [search, sort]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function del(id: number) {
    if (!(await confirm("Bu şablon silinsin mi?", { danger: true }))) return;
    try { await api(`/quotes/templates/${id}`, { method: "DELETE" }); load(); onChange(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Şablon adıyla ara…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Sel label="Sırala" value={sort} onChange={setSort} opts={[{ v: "az", l: "Ada göre (A→Z)" }, { v: "za", l: "Ada göre (Z→A)" }]} />
      </div>
      <div className="mt-4 flex justify-end">
        <Link href="/quotes/templates/new" className="btn-primary"><Plus size={16} /> Yeni</Link>
      </div>
      <p className="mt-4 text-sm text-muted"><b className="text-ink">{rows.length}</b> kayıt</p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Şablon Adı</th>
              <th className="px-4 py-3 font-medium">Tür</th>
              <th className="px-4 py-3 font-medium">İçerik</th>
              <th className="px-4 py-3 font-medium">Varsayılan</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Henüz şablon yok.</td></tr>
            ) : rows.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-medium text-ink">
                  <button onClick={() => router.push(`/quotes/templates/${t.id}`)} className="hover:text-primary">{t.name}</button>
                </td>
                <td className="px-4 py-3 text-ink-soft">{t.type}</td>
                <td className="px-4 py-3 text-ink-soft">{t.clause_count} madde</td>
                <td className="px-4 py-3">
                  {t.is_default
                    ? <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600"><Star size={14} className="fill-amber-400 text-amber-500" /> Varsayılan</span>
                    : <span className="text-muted">—</span>}
                </td>
                <td className="px-4 py-3">{t.is_active ? <span className="font-medium text-success">Aktif</span> : <span className="text-muted">Pasif</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/quotes/templates/${t.id}`} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil size={14} /> Düzenle</Link>
                    <button onClick={() => del(t.id)} className="btn-danger px-2.5 py-1.5 text-xs"><Trash2 size={14} /> Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}
