"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Açık/koyu mod anahtarı — tercih localStorage'da saklanır (key: "theme"). */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Açık moda geç" : "Koyu moda geç"}
      title={dark ? "Açık mod" : "Koyu mod"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft transition hover:bg-surface"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
