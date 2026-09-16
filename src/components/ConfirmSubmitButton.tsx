"use client";

import { useFormStatus } from "react-dom";

/**
 * SubmitButton com um freio antes de valer o clique — pra ações que
 * mexem em dinheiro/estoque já registrado (cancelar venda, reverter
 * produção, transferir organização) e não têm como voltar atrás sozinhas.
 */
export function ConfirmSubmitButton({
  children,
  pendingText,
  confirmMessage,
  className = "btn-danger",
}: {
  children: React.ReactNode;
  pendingText?: string;
  confirmMessage: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? (pendingText ?? "Aguarde…") : children}
    </button>
  );
}
