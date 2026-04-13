"use client";
import { ReactNode } from "react";
import { I18nProvider, LangToggle } from "../lib/i18n";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <LangToggle />
      {children}
    </I18nProvider>
  );
}
