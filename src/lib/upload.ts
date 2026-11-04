/**
 * Image Upload Service - Demo Mode
 * Uses Vercel Blob for storing product images and files.
 * Replaces ImageKit which is not available on Vercel Serverless.
 *
 * Environment variable needed:
 * - BLOB_READ_WRITE_TOKEN: Vercel Blob read/write token
 */

// Image upload result
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload image via server-side API route to Vercel Blob
 * Falls back to base64 if upload fails or API is not available
 */
export async function uploadImage(file: File, folderPath: string = "/products/general"): Promise<UploadResult> {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: "حجم الملف كبير جداً (الحد الأقصى 5MB)" };
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: "نوع الملف غير مدعوم (JPEG, PNG, WebP, GIF)" };
    }

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderPath", folderPath);

        const response = await fetch("/api/upload/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[Upload API] Upload failed:", errorData);
            return convertToBase64(file);
        }

        const result = await response.json();

        if (result.success && result.url) {
            return {
                success: true,
                url: result.url,
            };
        }

        return convertToBase64(file);
    } catch (error) {
        console.error("[Upload API] Error:", error);
        return convertToBase64(file);
    }
}

/**
 * Convert file to base64 (fallback for development)
 */
async function convertToBase64(file: File): Promise<UploadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        success: true,
        url: reader.result as string,
      });
    };
    reader.onerror = () => {
      resolve({
        success: false,
        error: "فشل قراءة الملف",
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
  } catch {
    return false;
  }
}

/**
 * Get optimized image URL
 * Vercel Blob doesn't support on-the-fly transformations like ImageKit,
 * so we return the URL as-is.
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): string {
  return url;
}

/**
 * Check if Vercel Blob is configured
 */
export async function checkImageKitConfig(): Promise<{
  configured: boolean;
  publicKey?: string;
  urlEndpoint?: string;
}> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return {
    configured: !!token,
    publicKey: token ? "vercel-blob" : undefined,
    urlEndpoint: token ? "https://blob.vercel-storage.com" : undefined,
  };
}

/**
 * Delete image from Vercel Blob
 */
export async function deleteImageFromImageKit(imageUrl: string): Promise<boolean> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error("[Delete] Vercel Blob token is missing.");
      return false;
    }

    // Vercel Blob URLs can be deleted via DELETE request
    const deleteResponse = await fetch(imageUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (deleteResponse.ok || deleteResponse.status === 204) {
      console.log("[Delete] Image deleted successfully from Vercel Blob:", imageUrl);
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Vercel Blob] Delete error:", error);
    return false;
  }
}
