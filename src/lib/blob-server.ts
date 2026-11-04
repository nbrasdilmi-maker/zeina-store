/**
 * Server-only Vercel Blob helpers.
 * Never import this module from a Client Component: it uses the
 * BLOB_READ_WRITE_TOKEN secret.
 */

const BLOB_API_URL = "https://vercel.com/api/blob";

function getBlobToken(): { token: string; storeId: string } | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const storeId = token.split("_")[3] || "";
  return { token, storeId };
}

/**
 * Delete an image from Vercel Blob.
 * Returns true when the request was accepted.
 */
export async function deleteBlobImage(imageUrl: string): Promise<boolean> {
  try {
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return false;
    }

    const blobAuth = getBlobToken();
    if (!blobAuth) {
      return false;
    }

    const response = await fetch(`${BLOB_API_URL}/delete`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${blobAuth.token}`,
        "content-type": "application/json",
        "x-api-version": "13",
        "x-api-blob-request-id": `${blobAuth.storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
        "x-api-blob-request-attempt": "0",
        ...(blobAuth.storeId
          ? { "x-vercel-blob-store-id": blobAuth.storeId }
          : {}),
      },
      body: JSON.stringify({ urls: [imageUrl] }),
    });

    if (!response.ok) {
      console.error("[Vercel Blob] Delete failed:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Vercel Blob] Delete error:", error);
    return false;
  }
}
