import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'البريد الإلكتروني مطلوب' 
      }, { status: 400 });
    }

    // Demo mode: simulate email sending without Brevo
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`[Demo Test Email] Simulated email to ${email} with code: ${verificationCode}`);

    return NextResponse.json({
      success: true,
      message: 'تم محاكاة إرسال البريد التجريبي (وضع التجريبي - لا يتم إرسال إيميل فعلي)',
      messageId: `demo-${Date.now()}`,
      recipient: email,
      code: verificationCode,
      demo: true,
    });

  } catch (error) {
    console.error('خطأ:', error);
    return NextResponse.json({
      success: false,
      message: 'حدث خطأ غير متوقع',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    }, { status: 500 });
  }
}
