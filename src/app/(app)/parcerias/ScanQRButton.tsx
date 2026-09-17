"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export function ScanQRButton({ onDecode }: { onDecode: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const onDecodeRef = useRef(onDecode);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  });

  function stop() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  // Desliga a camera se o componente sair da tela com a leitura aberta.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // O <video> so entra no DOM depois de scanning virar true, entao ligar o
  // stream dentro de start() nao funciona: naquele momento videoRef.current
  // ainda e null e o elemento nasce sem imagem (camera acesa, tela preta).
  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      setError("Não deu pra iniciar o vídeo da câmera — digite o código.");
    });

    function tick() {
      const canvas = canvasRef.current;
      if (!canvas || video!.readyState !== video!.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video!.videoWidth;
      canvas.height = video!.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video!, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        onDecodeRef.current(code.data);
        stop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [scanning]);

  async function start() {
    setError(null);
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setError("Leitura de câmera só funciona em HTTPS (ou localhost) — digite o código.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Esse navegador não suporta leitura de câmera — digite o código.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setError("Permissão de câmera negada — libere o acesso nas configurações do navegador ou digite o código.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("Não achei uma câmera nesse dispositivo — digite o código.");
      } else if (name === "NotReadableError") {
        setError("A câmera já está sendo usada por outro app — digite o código.");
      } else {
        setError("Não deu pra acessar a câmera — digite o código.");
      }
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
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black"
            autoPlay
            muted
            playsInline
          />
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
