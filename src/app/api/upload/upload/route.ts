import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/upload/upload
 * Upload image to Vercel Blob server-side.
 * The client sends the file, and this route uploads it to Vercel Blob
 * using the BLOB_READ_WRITE_TOKEN from environment variables (server-side only).
 * The token is never exposed to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Vercel Blob not configured", configured: false },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderPath = formData.get("folderPath") as string || "/products/general";

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

    // Create a unique filename
    const fileName = `${folderPath.replace(/^\//, "")}/zeina-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const uploadResponse = await fetch(`https://put.blob.vercel-storage.com/${fileName}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "x-add-random-suffix": "false",
      },
      body: file as unknown as BodyInit,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[Vercel Blob] Upload failed:", errorText);
      return NextResponse.json(
        { error: `Upload failed: ${uploadResponse.status}` },
        { status: 500 }
      );
    }

    const result = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      url: result.url || result.downloadUrl,
    });
  } catch (error) {
    console.error("[Vercel Blob] Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
