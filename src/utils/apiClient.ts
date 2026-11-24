/**
 * Safely posts FormData to a forensic API endpoint, handling non-JSON proxy/server
 * responses gracefully with automatic transient retry and clear error reporting.
 */
export async function postForensicForm<T>(
  endpoint: string,
  formData: FormData,
  maxRetries = 1
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";
      const rawText = await response.text();
      const trimmed = rawText.trim();

      const looksLikeJson =
        contentType.includes("application/json") ||
        trimmed.startsWith("{") ||
        trimmed.startsWith("[");

      if (!looksLikeJson) {
        const isTransient =
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504 ||
          response.status === 200;

        if (isTransient && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
          continue;
        }

        if (response.status === 413) {
          throw new Error(
            "Uploaded file exceeds the transfer size limit. Try a smaller file or shorter clip."
          );
        }

        throw new Error(
          `Server returned a non-JSON response (HTTP ${response.status}). Please refresh the page and retry your scan.`
        );
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        throw new Error(
          `Received malformed JSON from the analysis server (HTTP ${response.status}). Please try again.`
        );
      }

      if (!response.ok) {
        const msg =
          typeof parsed.error === "string" && parsed.error
            ? parsed.error
            : `Forensic analysis request failed (HTTP ${response.status}).`;
        throw new Error(msg);
      }

      return parsed as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries && lastError.message.includes("Failed to fetch")) {
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Forensic analysis request failed.");
}
