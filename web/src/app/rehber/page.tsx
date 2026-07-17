"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Post = {
  id: number;
  type: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  icon: string | null;
  published_at: string | null;
};

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("tr-TR");
}

/** Rehber (blog) liste sayfası — /rehber */
export default function BlogListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<Post[]>("/public/content?type=blog", { auth: false })
      .then((r) => { if (active) setPosts(Array.isArray(r) ? r : []); })
      .catch(() => { if (active) setPosts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-ink">Rehber</h1>
        <p className="mt-3 text-lg text-ink-soft">Asansör bakımı ve dijital operasyon üzerine yazılar.</p>

        {loading ? (
          <p className="py-20 text-center text-muted">Yükleniyor…</p>
        ) : posts.length === 0 ? (
          <p className="py-20 text-center text-muted">Henüz yazı yok.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/rehber/${p.slug}`}
                className="rounded-2xl border border-line bg-card p-6 transition hover:border-primary/40 hover:shadow-md"
              >
                {p.published_at && <div className="text-xs text-muted">{fmtDate(p.published_at)}</div>}
                <h2 className="mt-2 font-semibold text-ink">{p.title}</h2>
                {p.excerpt && <p className="mt-2 text-sm text-ink-soft">{p.excerpt}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
