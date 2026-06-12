// helpers/fetchLogo.ts

const logoCache = new Map<string, { base64: string; mime: string }>();

function getMimeFromUrl(url: string) {
  const cleanUrl = url.split("?")[0] ?? "";
  const ext = cleanUrl.split(".").pop()?.toLowerCase();

  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "webp") return "image/webp";

  return "image/webp";
}

export async function fetchInternalLogoWithRetry(
  url: string,
  timeoutMs = 5000,
  retries = 2
): Promise<{ base64: string; mime: string } | null> {
  const cached = logoCache.get(url);
  if (cached) return cached;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer.byteLength) {
        throw new Error("Logo vacío");
      }

      const contentType = response.headers.get("content-type");
      const mime =
        contentType && contentType.startsWith("image/")
          ? contentType.split(";")[0]
          : getMimeFromUrl(url);

      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const result = { base64, mime };
      logoCache.set(url, result);

      return result;
    } catch (err) {
      clearTimeout(timer);

      console.warn(
        `[fetchLogoWithRetry] Sin logo remoto intento ${attempt}/${retries}:`,
        err
      );

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return null;
}