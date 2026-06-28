// src/lib/format.ts

export const TRY = (n: number | string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(n) || 0);

export const dateTR = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("tr-TR") : "—";
