"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Content = {
  id: number;
  type: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  icon: string | null;
  published_at: string | null;
};

/** Çözüm (solution) detay sayfası — /cozumler/{slug} */
export default function SolutionDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [item, setItem] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    api<Content>(`/public/content/${slug}`, { auth: false })
      .then((r) => { if (active) setItem(r); })
      .catch((e: unknown) => {
        if (!active) return;
        if (!(e instanceof ApiError && e.status === 404)) console.error("İçerik yüklenemedi:", e);
        setNotFound(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {loading ? (
          <p className="py-20 text-center text-muted">Yükleniyor…</p>
        ) : notFound || !item ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-ink">Sayfa bulunamadı.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-primary hover:text-primary-dark">Ana sayfaya dön</Link>
          </div>
        ) : (
          <article>
            <Link href="/#moduller" className="text-sm text-muted hover:text-primary">← Çözümler</Link>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">{item.title}</h1>
            {item.excerpt && <p className="mt-3 text-lg text-ink-soft">{item.excerpt}</p>}
            <div className="mt-6">
              {(item.body ?? "").split(/\n\n+/).map((p, i) => (
                <p key={i} className="mt-4 whitespace-pre-line leading-relaxed text-ink-soft">{p}</p>
              ))}
            </div>

            <div className="mt-12 rounded-2xl bg-primary p-8 text-center">
              <h2 className="text-2xl font-bold text-white">Hemen deneyin</h2>
              <Link
                href="/login"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary-light"
              >
                Ücretsiz Başla <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
