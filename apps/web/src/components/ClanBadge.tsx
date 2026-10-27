"use client";

import { Shield } from "lucide-react";
import { useState } from "react";

export function ClanBadge({ url, size = 48 }: { url: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- icono remoto pequeño, no compensa configurar next/image
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center surface rounded-2xl"
      style={{ width: size, height: size }}
    >
      <Shield size={size * 0.55} strokeWidth={1.5} className="text-text-secondary" />
    </span>
  );
}
