"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  MessageCircle,
  Heart,
  Sparkles,
  Twitter,
  Facebook,
} from "lucide-react";

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-[#3D3021] to-[#2A2318] text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <img
                src="/zeina-logo-footer.png"
                alt="زينة"
                className="h-20 w-auto object-contain"
              />
            </div>
            <p className="text-white/60 leading-relaxed mb-6">
              وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن.
              نقدم لكي تجربة تسوق فريدة ومميزة.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/tarifa.store.ye"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 flex items-center justify-center transition-all duration-300 group"
                aria-label="تابعنا على انستغرام"
              >
                <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-[#25D366] flex items-center justify-center transition-all duration-300 group"
                aria-label="تواصل معنا عبر واتساب"
              >
                <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-[#1DA1F2] flex items-center justify-center transition-all duration-300 group"
                aria-label="تابعنا على تويتر"
              >
                <Twitter className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-[#1877F2] flex items-center justify-center transition-all duration-300 group"
                aria-label="تابعنا على فيسبوك"
              >
                <Facebook className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#C9A962]">
              روابط سريعة
            </h3>
            <ul className="space-y-4">
              {[
                { href: "/", label: "الرئيسية" },
                { href: "/products", label: "المنتجات" },
                { href: "/categories", label: "الفئات" },
                { href: "/about", label: "عن المتجر" },
                { href: "/contact", label: "تواصل معنا" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-[#C9A962] transition-colors duration-300 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A962]/50"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#C9A962]">
              خدمة العملاء
            </h3>
            <ul className="space-y-4">
              {[
                {
                  href: "/policies?tab=shipping",
                  label: "سياسة الشحن والتوصيل",
                },
                {
                  href: "/policies?tab=returns",
                  label: "سياسة الإرجاع والاستبدال",
                },
                { href: "/policies?tab=faq", label: "الأسئلة الشائعة" },
                { href: "/policies?tab=terms", label: "الشروط والأحكام" },
                { href: "/policies?tab=privacy", label: "سياسة الخصوصية" },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="text-white/60 hover:text-[#C9A962] transition-colors duration-300 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A962]/50"></span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#C9A962]">
              تواصل معنا
            </h3>
            <ul className="space-y-5">
              <li className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#C9A962]/20 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-[#C9A962]" />
                </div>
                <div>
                  <p className="text-white/40 text-sm">اتصل بنا</p>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-[#C9A962] transition-colors"
                    dir="ltr"
                  >
                    +967 776 080 395
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#C9A962]/20 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-[#C9A962]" />
                </div>
                <div>
                  <p className="text-white/40 text-sm">البريد الإلكتروني</p>
                  <a
                    href="mailto:tarifa.store.ye@gmail.com"
                    className="text-white hover:text-[#C9A962] transition-colors"
                    dir="ltr"
                  >
                    tarifa.store.ye@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#C9A962]/20 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-[#C9A962]" />
                </div>
                <div>
                  <p className="text-white/40 text-sm">العنوان</p>
                  <p className="text-white">صنعاء، الجمهورية اليمنية</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              © {currentYear} زينة. جميع الحقوق محفوظة.
            </p>
            <p className="text-white/40 text-sm flex items-center gap-1">
              تطوير : محمد ابراهيم الديلمي |776668662
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
