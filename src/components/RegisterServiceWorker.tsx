"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalar sem SW ainda funciona, so perde o cache do shell
      });
    }
  }, []);
  return null;
}
