import { Construction } from "lucide-react";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-line bg-white py-20 text-center">
        <Construction size={40} className="text-muted" />
        <p className="mt-3 font-medium text-ink-soft">Bu modül yapım aşamasında</p>
        <p className="mt-1 text-sm text-muted">Backend API hazır; arayüz ekranı yakında eklenecek.</p>
      </div>
    </div>
  );
}
