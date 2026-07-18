"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import Modal, { Field } from "@/components/Modal";
import { MessageCircle, Plus, Pencil, Trash2, Send } from "lucide-react";

type Template = { id: number; name: string; body: string };
type Customer = { id: number; name: string; phone: string | null };
type Log = { id: number; recipient: string; message: string; status: string | null; created_at: string };

/** Telefonu wa.me formatına çevir (90XXXXXXXXXX). */
function waNumber(phone: string | null): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("90")) return d;
  return "90" + d;
}
function fmt(d: string) {
  return new Date(d).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

export default function WhatsAppPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", body: "" });
  const [saving, setSaving] = useState(false);

  const [custId, setCustId] = useState("");
  const [tplId, setTplId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setTemplates(await api<Template[]>("/whatsapp/templates"));
    const c = await api<{ data?: Customer[] } | Customer[]>("/customers?per_page=200");
    setCustomers(Array.isArray(c) ? c : (c.data ?? []));
    try { const h = await api<{ data: Log[] }>("/whatsapp/history"); setLogs(h.data ?? []); } catch { /* yoksa boş */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const customer = useMemo(() => customers.find((c) => String(c.id) === custId), [customers, custId]);

  function applyTemplate(id: string) {
    setTplId(id);
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    setMessage(t.body.replaceAll("{ad}", customer?.name ?? "").replaceAll("{telefon}", customer?.phone ?? ""));
  }

  function openNew() { setEditId(null); setForm({ name: "", body: "" }); setModal(true); }
  function openEdit(t: Template) { setEditId(t.id); setForm({ name: t.name, body: t.body }); setModal(true); }
  async function save() {
    setSaving(true);
    try {
      await api(editId ? `/whatsapp/templates/${editId}` : "/whatsapp/templates", { method: editId ? "PUT" : "POST", body: form });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }
  async function del(t: Template) {
    if (!confirm(`"${t.name}" şablonu silinsin mi?`)) return;
    try { await api(`/whatsapp/templates/${t.id}`, { method: "DELETE" }); load(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  function send() {
    if (!customer?.phone) { alert("Seçili müşterinin telefonu yok."); return; }
    window.open(`https://wa.me/${waNumber(customer.phone)}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageCircle className="text-success" />
        <h1 className="text-2xl font-bold text-ink">WhatsApp</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Mesaj şablonları oluşturun, müşterilere tek tıkla WhatsApp'tan gönderin.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="text-sm font-semibold text-ink">Müşteriye Gönder</div>
          <div className="mt-4 space-y-4">
            <Field label="Müşteri">
              <select className="input" value={custId} onChange={(e) => setCustId(e.target.value)}>
                <option value="">Müşteri seçin…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Şablon">
              <select className="input" value={tplId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">Şablon seçin…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Mesaj">
              <textarea className="input min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mesajınız…" />
            </Field>
            {customer && !customer.phone && <p className="text-sm text-danger">Bu müşterinin telefon numarası yok.</p>}
            <button onClick={send} disabled={!customer?.phone || !message.trim()} className="btn-primary w-full"><Send size={16} /> WhatsApp'ta Aç ve Gönder</button>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">Mesaj Şablonları</div>
            <button onClick={openNew} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"><Plus size={14} /> Ekle</button>
          </div>
          <p className="mt-1 text-xs text-muted">Yer tutucular: <code className="text-ink-soft">{"{ad}"}</code>, <code className="text-ink-soft">{"{telefon}"}</code> — gönderirken müşteri bilgisiyle dolar.</p>
          <div className="mt-3 space-y-2">
            {templates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Henüz şablon yok.</p>
            ) : templates.map((t) => (
              <div key={t.id} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{t.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted">{t.body}</div>
                </div>
                <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-muted hover:bg-card hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                <button onClick={() => del(t)} className="rounded-lg p-1.5 text-muted hover:bg-card hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">Gönderim Geçmişi</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Alıcı</th>
              <th className="px-4 py-3 font-medium">Mesaj</th>
              <th className="px-4 py-3 font-medium text-right">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">Kayıt yok.</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 text-ink-soft">{l.recipient}</td>
                <td className="px-4 py-3 text-muted max-w-md truncate">{l.message}</td>
                <td className="px-4 py-3 text-right text-xs text-muted">{fmt(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Şablon Düzenle" : "Yeni Şablon"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.name || !form.body} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Şablon Adı *"><input className="input" placeholder="Bakım hatırlatma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mesaj Metni *"><textarea className="input min-h-32" placeholder="Merhaba {ad}, asansör bakımınız yaklaşıyor…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <p className="text-xs text-muted">Yer tutucular: <code>{"{ad}"}</code> müşteri adı, <code>{"{telefon}"}</code> telefonu.</p>
        </Modal>
      )}
    </div>
  );
}
