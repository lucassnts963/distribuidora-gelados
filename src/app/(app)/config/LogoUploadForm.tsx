"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setOrgLogoAction } from "./actions";

export function LogoUploadForm({ orgId, logoUrl }: { orgId: string; logoUrl: string | null }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(logoUrl);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "png";
    const path = `${orgId}/logo/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("product-photos").upload(path, file, {
      upsert: true,
    });
    if (uploadError) {
      setError("Não deu pra enviar: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
    const form = new FormData();
    form.set("logo_url", data.publicUrl);
    const result = await setOrgLogoAction(form);
    if (result?.error) {
      setError(result.error);
      setUploading(false);
      return;
    }

    setPreview(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-12 w-12 rounded-lg object-contain bg-white" />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-stone-100" />
      )}
      <label className="btn-ghost cursor-pointer text-xs">
        {uploading ? "Enviando…" : preview ? "Trocar logo" : "Adicionar logo"}
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={uploading} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
