"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

/**
 * Substitui window.confirm() por um <dialog> de verdade, integrado à UI.
 * Fica aberto se a action retornar erro (mostra o motivo ali dentro, sem
 * fechar) e só fecha sozinho quando `success` vira true — pra ações que
 * mexem em dinheiro/estoque já registrado (cancelar venda, reverter
 * produção, transferir organização, estornar despesa/compra) e não têm
 * como voltar atrás sozinhas.
 */
export function ConfirmDialog({
  children,
  confirmMessage,
  confirmLabel = "Confirmar",
  pendingText,
  className = "btn-danger",
  error,
  success,
  extraFields,
}: {
  children: React.ReactNode;
  confirmMessage: string;
  confirmLabel?: string;
  pendingText?: string;
  className?: string;
  error?: string | null;
  success?: boolean;
  /** Campos extras (ex: motivo do cancelamento) renderizados dentro do diálogo, entre a mensagem e os botões. */
  extraFields?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (success) ref.current?.close();
  }, [success]);

  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={ref}
        className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-stone-200/80 bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="space-y-3 p-4">
          <p className="text-sm">{confirmMessage}</p>
          {extraFields}
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="btn-danger flex-1" disabled={pending}>
              {pending ? (pendingText ?? "Aguarde…") : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
