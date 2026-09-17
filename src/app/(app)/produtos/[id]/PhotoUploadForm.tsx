"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setVariantPhotoAction } from "../actions";

export function PhotoUploadForm({
  productId,
  variantId,
  orgId,
  photoUrl,
}: {
  productId: string;
  variantId: string;
  orgId: string;
  photoUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(photoUrl);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${orgId}/${variantId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("product-photos").upload(path, file, {
      upsert: true,
    });
    if (uploadError) {
      setError("Não deu pra enviar a foto: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
    const form = new FormData();
    form.set("id", variantId);
    form.set("product_id", productId);
    form.set("photo_url", data.publicUrl);
    const result = await setVariantPhotoAction(form);
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
        <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-stone-100" />
      )}
      <label className="btn-ghost cursor-pointer text-xs">
        {uploading ? "Enviando…" : preview ? "Trocar foto" : "Adicionar foto"}
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={uploading} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
