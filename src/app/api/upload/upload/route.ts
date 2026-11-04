import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BLOB_API_URL = "https://vercel.com/api/blob";

function getBlobToken(): { token: string; storeId: string } | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  // BLOB_READ_WRITE_TOKEN = vercel_blob_rw_<storeId>_<secret>
  const storeId = token.split("_")[3] || "";
  return { token, storeId };
}

function blobHeaders(token: string, storeId: string, extra?: Record<string, string>) {
  return {
    authorization: `Bearer ${token}`,
    "x-api-version": "13",
    "x-api-blob-request-id": `${storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    "x-api-blob-request-attempt": "0",
    ...(storeId ? { "x-vercel-blob-store-id": storeId } : {}),
    ...extra,
  };
}

/**
 * POST /api/upload/upload
 * Upload an image to Vercel Blob using the official REST API.
 * The BLOB_READ_WRITE_TOKEN never reaches the browser.
 */
export async function POST(request: NextRequest) {
  try {
    const blobAuth = getBlobToken();

    if (!blobAuth) {
      return NextResponse.json(
        {
          error:
            "Vercel Blob غير مربوط بالمشروع. أضف BLOB_READ_WRITE_TOKEN في إعدادات Vercel.",
          configured: false,
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderPath =
      (formData.get("folderPath") as string | null) || "/products/general";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "حجم الملف كبير جداً (الحد الأقصى 5MB)" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم (JPEG, PNG, WebP, GIF)" },
        { status: 400 }
      );
    }

    // Create a unique, safe pathname inside the blob store
    const safeFolder = folderPath
      .replace(/^\/+/, "")
      .replace(/[^a-zA-Z0-9/_-]/g, "")
      .replace(/\/+/g, "/");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${safeFolder || "products/general"}/zeina-${Date.now()}-${safeName}`;

    const uploadUrl = `${BLOB_API_URL}/?${new URLSearchParams({
      pathname: fileName,
    }).toString()}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: blobHeaders(blobAuth.token, blobAuth.storeId, {
        "x-content-type": file.type,
        "x-add-random-suffix": "0",
        "x-vercel-blob-access": "public",
        "x-content-length": String(file.size),
      }),
      body: file,
    });

    const result = await uploadResponse.json().catch(() => null);

    if (!uploadResponse.ok) {
      console.error("[Vercel Blob] Upload failed:", uploadResponse.status, result);
      return NextResponse.json(
        {
          error:
            result?.error?.message ||
            `تعذر رفع الصورة إلى Vercel Blob (${uploadResponse.status}).`,
          configured: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result?.url || result?.downloadUrl,
      pathname: result?.pathname,
    });
  } catch (error) {
    console.error("[Vercel Blob] Upload error:", error);
    return NextResponse.json(
      {
        error:
          "تعذر رفع الصورة. تأكد من ربط متجر Vercel Blob بالمشروع (BLOB_READ_WRITE_TOKEN).",
        configured: false,
      },
      { status: 500 }
    );
  }
}
