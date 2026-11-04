import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/upload/auth
 * Generate upload authorization for Vercel Blob.
 * In demo mode, returns a simple success response since Vercel Blob
 * uses bearer token authentication directly in the upload request.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName } = body;

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json({
        error: "Vercel Blob not configured",
        message: "Please add BLOB_READ_WRITE_TOKEN to your environment variables",
      }, { status: 500 });
    }

    // Vercel Blob uses direct PUT with bearer token.
    // We do NOT return the token to the client for security reasons.
    // The client should use a signed URL or direct upload with their own token.
    // For demo mode, we return a placeholder URL that the client can use with
    // the uploadImage function which handles the token server-side.
    return NextResponse.json({
      success: true,
      configured: true,
      fileName: fileName || `zeina-${Date.now()}`,
      message: "Vercel Blob is configured. Use /api/upload/auth to get upload URL.",
      // Return a temporary upload URL that includes a one-time token
      // In production, this should be a signed URL with limited scope
      uploadUrl: `/api/upload/upload`,
    });

  } catch (error) {
    console.error("Upload auth error:", error);
    return NextResponse.json({
      error: "Failed to generate upload authorization",
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check if Vercel Blob is configured
 */
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  const isConfigured = !!token;

  return NextResponse.json({
    configured: isConfigured,
    message: isConfigured
      ? "Vercel Blob is configured and ready to use"
      : "Vercel Blob is not configured. Please add BLOB_READ_WRITE_TOKEN to your environment variables.",
  });
}
