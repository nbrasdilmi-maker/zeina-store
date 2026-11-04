import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function extractJsonFromText(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch (e) {
    console.error("فشل استخراج JSON:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = await request.json();
    const { imageUrl, categoryNameAr } = body;
    if (!imageUrl)
      return NextResponse.json({ error: "رابط الصورة مطلوب" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return NextResponse.json(
        { error: "مفتاح Gemini غير موجود" },
        { status: 500 },
      );

    // 4. بناء prompt دقيق
    const prompt = `
أنت مساعد خبير في التجارة الإلكترونية. سأعطيك صورة منتج وتصنيفه (${categoryNameAr || "عام"}).
قم بتحليل الصورة وأعد لي البيانات التالية بصيغة JSON فقط (بدون أي نص إضافي):

{
  "nameAr": "اسم المنتج بالعربية (مختصر وجذاب)",
  "nameEn": "اسم المنتج بالإنجليزية (دقيق)",
  "descriptionAr": "وصف عربي تسويقي جميل (3-4 أسطر) يبرز الميزات والاستخدام",
  "descriptionEn": "وصف إنجليزي مقابل (3-4 أسطر)",
  "featuresAr": "المميزات الرئيسية (نقاط مختصرة بالعربية، 3-5 نقاط)",
  "usageAr": "طريقة الاستخدام (بالعربية، إن وجدت)",
  "priceEstimate": "سعر تقديري مقترح بالريال اليمني (رقم فقط، اختياري)"
}

ملاحظات:
- إذا كان المنتج عطرًا، اذكر العائلة العطرية والمكونات البارزة في الوصف والمميزات.
- إذا كان ساعة أو إكسسوار، اذكر الخامة والتصميم.
- أبدع في الوصف العربي ليكون فخمًا وجذابًا.
- السعر التقديري يكون رقمًا صحيحًا بدون عملة.

الرد يجب أن يكون JSON فقط. لا تكتب أي شيء آخر.
`;

    // 5. استخدام Gemini Pro Vision API مباشرة
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok)
      return NextResponse.json(
        { error: "فشل تحميل الصورة من الرابط" },
        { status: 400 },
      );

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const base64Data = Buffer.from(imageArrayBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // إرسال الطلب
    const geminiBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Data } },
          ],
        },
      ],
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini error:", errorText);
      return NextResponse.json(
        { error: "فشل الاتصال بـ Gemini" },
        { status: 500 },
      );
    }

    const geminiData = await geminiResponse.json();
    const generatedText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText)
      return NextResponse.json(
        { error: "لم يتمكن الذكاء الاصطناعي من تحليل الصورة" },
        { status: 500 },
      );

    const productData = extractJsonFromText(generatedText);
    if (!productData)
      return NextResponse.json(
        { error: "فشل في قراءة بيانات المنتج من الرد" },
        { status: 500 },
      );

    return NextResponse.json({
      success: true,
      data: {
        nameAr: productData.nameAr || "",
        nameEn: productData.nameEn || "",
        descriptionAr: productData.descriptionAr || "",
        descriptionEn: productData.descriptionEn || "",
        featuresAr: productData.featuresAr || "",
        usageAr: productData.usageAr || "",
        priceEstimate: productData.priceEstimate || null,
      },
    });
  } catch (error) {
    console.error("AI generate error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
