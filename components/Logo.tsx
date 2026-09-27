"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Logo asli Akselera.Tech. File aslinya ada di:
//   - /public/logo-black.png (dipakai di light mode)
//   - /public/logo-white.png (dipakai di dark mode)
export default function Logo({ className = "h-8" }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Hindari flash/mismatch saat hydration sebelum tema diketahui
    return <div className={`${className} w-32`} />;
  }

  const src = resolvedTheme === "dark" ? "/logo-white.png" : "/logo-black.png";

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={src} alt="Akselera.Tech" className={`${className} w-auto`} />
  );
}
