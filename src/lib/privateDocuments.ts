export async function uploadPrivateDocument(
  dataUrl: string,
  companyId: string,
  fileName: string,
): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  if (import.meta.env.DEV) return dataUrl;

  const response = await fetch("/api/private-documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, companyId, fileName }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Private document upload failed.");
  return result.url;
}
