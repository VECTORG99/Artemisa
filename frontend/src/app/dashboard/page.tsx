"use client";

import { useTranslations } from "@/i18n";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <main className="min-h-screen px-6 py-8">
      <h1 className="text-2xl font-bold text-emerald-400">{t.title}</h1>
      <p className="mt-2 text-zinc-400">{t.placeholder}</p>
    </main>
  );
}
