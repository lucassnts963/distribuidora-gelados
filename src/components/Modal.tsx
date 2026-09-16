"use client";

import { useRef } from "react";
import { X } from "lucide-react";

export function Modal({
  triggerLabel,
  triggerClassName = "btn-primary",
  title,
  children,
}: {
  triggerLabel: string;
  triggerClassName?: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {triggerLabel}
      </button>
      <dialog
        ref={ref}
        className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200/80 bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">{title}</h3>
            <button type="button" className="text-stone-400" onClick={() => ref.current?.close()}>
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
