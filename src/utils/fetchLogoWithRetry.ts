// helpers/fetchLogo.ts

const logoCache = new Map<string, { base64: string; mime: string }>();

export async function fetchLogoWithRetry(
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
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mime = response.headers.get("content-type") ?? "image/webp";

      const result = { base64, mime };
      logoCache.set(url, result);
      return result;
    } catch (err) {
      clearTimeout(timer);
      console.warn(`Sin logo (intento ${attempt}/${retries}):`, err);

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return null;
}