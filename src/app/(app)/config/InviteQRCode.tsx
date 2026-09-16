"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function InviteQRCode({ inviteCode }: { inviteCode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, inviteCode, { width: 128, margin: 1 }).catch(() => {});
  }, [inviteCode]);

  return <canvas ref={canvasRef} className="rounded-lg border border-stone-200" />;
}
