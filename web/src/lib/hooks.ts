// src/lib/hooks.ts
"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

type Option = { id: number; label: string };

/** Bir liste endpoint'inden dropdown seçenekleri çeker (per_page=100). */
export function useOptions(endpoint: string, labelKey = "name"): Option[] {
  const [opts, setOpts] = useState<Option[]>([]);
  useEffect(() => {
    const sep = endpoint.includes("?") ? "&" : "?";
    api<{ data: Record<string, unknown>[] }>(`${endpoint}${sep}per_page=100`)
      .then((r) =>
        setOpts(
          r.data.map((row) => ({
            id: Number(row.id),
            label: String(row[labelKey] ?? row.name ?? `#${row.id}`),
          }))
        )
      )
      .catch(() => setOpts([]));
  }, [endpoint, labelKey]);
  return opts;
}
