import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { PusherListener } from "@/components/shared/pusher-listener";
import { SWRegistration } from "@/components/shared/sw-registration";
import { AccountingProvider } from "@/contexts/accounting-context";
import { DemoRoleSwitcher } from "@/components/demo/role-selector";
import { GlobalBottomNav } from "@/components/layout/global-bottom-nav";

const tajawal = localFont({
  src: [
    { path: "../fonts/Tajawal/Tajawal-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "../fonts/Tajawal/Tajawal-Light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/Tajawal/Tajawal-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Tajawal/Tajawal-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Tajawal/Tajawal-Bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/Tajawal/Tajawal-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../fonts/Tajawal/Tajawal-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-tajawal",
  display: "swap",
});

const amiri = localFont({
  src: [
    { path: "../fonts/Amiri-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Amiri-Bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/Amiri-Italic.ttf", weight: "400", style: "italic" },
    { path: "../fonts/Amiri-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-amiri",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#3D3021", // لون الشريط العلوي ليناسب فخامة ترفة
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // يمنع التكبير بالأصابع ليعطي شعور التطبيق الحقيقي
  viewportFit: "cover", // يجعل المحتوى يملأ الشاشة بالكامل حتى خلف النتوء (Notch)
};

export const metadata: Metadata = {
  title: "زينة | متجر الأناقة والجمال",
  description:
    "متجر زينة - وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "زينة",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    images: [
      {
        url: "/zeina-logo-header.png",
        width: 2172,
        height: 724,
        alt: "زينة - متجر الأناقة والجمال",
      },
    ],
  },
  twitter: {
    images: ["/zeina-logo-header.png"],
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${tajawal.variable} ${amiri.variable} font-sans antialiased bg-background text-foreground`}
      >
        <CartProvider>
          <WishlistProvider>
            <AccountingProvider>
              <SWRegistration />
              <PusherListener />
              {children}
              {/* Keeps page content and the footer above the fixed mobile nav. */}
              <div
                aria-hidden
                className="md:hidden"
                style={{
                  height: "calc(4rem + env(safe-area-inset-bottom))",
                }}
              />
              <GlobalBottomNav />
              <DemoRoleSwitcher />
            </AccountingProvider>
          </WishlistProvider>
        </CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
