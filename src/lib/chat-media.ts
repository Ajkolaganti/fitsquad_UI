/** Wire format: optional caption after image data URL (base64 never contains this sequence). */
export const CHAT_IMAGE_CAPTION_SEP = "__IMG_CAP__";

export type ParsedChatContent =
  | { kind: "text"; text: string }
  | { kind: "image"; dataUrl: string; caption?: string };

export function parseChatContent(raw: string): ParsedChatContent {
  if (!raw.startsWith("data:image/")) {
    return { kind: "text", text: raw };
  }
  const sep = CHAT_IMAGE_CAPTION_SEP;
  const i = raw.indexOf(sep);
  if (i === -1) {
    return { kind: "image", dataUrl: raw };
  }
  const dataUrl = raw.slice(0, i);
  const caption = raw.slice(i + sep.length).trim();
  return {
    kind: "image",
    dataUrl,
    caption: caption.length > 0 ? caption : undefined,
  };
}

/** Resize + JPEG compress so API payloads stay reasonable. */
export async function compressImageFile(
  file: File,
  opts?: { maxWidth?: number; maxPayloadChars?: number }
): Promise<string> {
  const maxWidth = opts?.maxWidth ?? 960;
  const maxPayloadChars = opts?.maxPayloadChars ?? 450_000;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w < 1 || h < 1) {
        reject(new Error("Invalid image"));
        return;
      }
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.82;
      let data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > maxPayloadChars && quality > 0.35) {
        quality -= 0.07;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > maxPayloadChars) {
        reject(
          new Error("Image is still too large after compression. Try another photo.")
        );
        return;
      }
      resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

export function buildImageMessage(dataUrl: string, caption?: string): string {
  const c = caption?.trim();
  if (c) return `${dataUrl}${CHAT_IMAGE_CAPTION_SEP}${c}`;
  return dataUrl;
}
