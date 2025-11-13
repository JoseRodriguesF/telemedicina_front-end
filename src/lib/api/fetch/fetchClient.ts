const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function fetchAPI(path: string, opts: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch error ${res.status}: ${text}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}
