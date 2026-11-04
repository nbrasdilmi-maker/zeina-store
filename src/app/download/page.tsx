import Link from 'next/link';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-rose-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
            زينة
          </h1>
          <p className="text-gray-500 mt-2">متجر الإكسسوارات الفاخرة</p>
        </div>

        {/* Download Box */}
        <div className="bg-gradient-to-r from-amber-100 to-rose-100 rounded-xl p-6 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">تحميل المشروع</h2>
          <p className="text-gray-600 text-sm mb-4">حجم الملف: 3 MB تقريباً</p>

          <a
            href="/api/download"
            className="inline-block w-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold py-4 px-8 rounded-xl hover:from-amber-600 hover:to-rose-600 transition-all transform hover:scale-105 shadow-lg"
          >
            ⬇️ تحميل الآن
          </a>
        </div>

        {/* Instructions */}
        <div className="text-right space-y-3 text-sm text-gray-600">
          <h3 className="font-bold text-gray-800 text-center mb-3">📋 خطوات التشغيل:</h3>
          <ol className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
              <span>فك ضغط الملف المحمّل</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>افتح المجلد في Visual Studio 2022</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>شغّل: <code className="bg-gray-100 px-2 rounded">bun install</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
              <span>شغّل: <code className="bg-gray-100 px-2 rounded">bun run dev</code></span>
            </li>
          </ol>
        </div>

        {/* Back Link */}
        <Link href="/" className="inline-block mt-6 text-amber-600 hover:text-amber-700 font-medium">
          ← العودة للمتجر
        </Link>
      </div>
    </div>
  );
}
