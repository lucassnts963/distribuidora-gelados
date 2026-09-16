"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export function ScanQRButton({ onDecode }: { onDecode: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stop() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => stop, []);

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      onDecode(code.data);
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Esse navegador não suporta leitura de câmera — digite o código.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Não deu pra acessar a câmera — digite o código.");
    }
  }

  return (
    <div className="space-y-2">
      {!scanning ? (
        <button type="button" className="btn-ghost" onClick={start}>
          Ler QR code
        </button>
      ) : (
        <div className="space-y-2">
          <video ref={videoRef} className="w-full rounded-lg" muted playsInline />
          <button type="button" className="btn-ghost w-full" onClick={stop}>
            Cancelar leitura
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
