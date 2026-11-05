"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAccounting } from "@/contexts/accounting-context";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  MapPin,
  Phone,
  Mail,
  Package,
  CreditCard,
  Store,
  UserCircle,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ImageIcon,
  Download,
  FileText,
  Printer,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// تعريف واجهة jsPDF مع autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: typeof autoTable;
}

// تعريف خط Amiri للـ PDF (سنقوم بتحميله بشكل ديناميكي)
const loadArabicFont = async (doc: jsPDF) => {
  // نحتاج لملف الخط بصيغة base64. سنستخدم Amiri-Regular من المشروع أو CDN
  const fontUrl =
    "https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHpUrtLMA7w.ttf";
  try {
    const response = await fetch(fontUrl);
    const fontBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(fontBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );
    doc.addFileToVFS("Amiri-Regular.ttf", base64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    return true;
  } catch (error) {
    console.warn(
      "لم يتم تحميل الخط العربي، سيتم استخدام الخط الافتراضي",
      error,
    );
    return false;
  }
};

// دالة مساعدة لعكس النص العربي لـ PDF (ضروري لأن jsPDF لا يدعم RTL تلقائياً)
const formatArabicForPDF = (text: string) => {
  return text.split("").reverse().join("");
};

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  color?: string | null;
  product: {
    id: string;
    name: string;
    nameAr: string;
    mainImage: string;
    price: number;
    sku?: string | null;
    colors?: string | null;
    sizes?: string | null;
    merchant?: {
      storeName: string;
      user: { name: string; phone: string };
    } | null;
    agent?: { name: string } | null;
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentDetails: string | null;
  notes: string | null;
  address: string | null;
  phone: string | null;
  governorate: string | null;
  locationUrl: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string | null;
  };
  agent?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  items: OrderItem[];
  governorateRel?: {
    id: string;
    name: string;
    nameAr: string;
  } | null;
}

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
}: OrderDetailsDialogProps) {
  const { fetchWithAuth } = useAccounting();
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("customer");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: string; icon: any }
    > = {
      PENDING: {
        label: "قيد الانتظار",
        color: "bg-yellow-100 text-yellow-700",
        icon: Clock,
      },
      PROCESSING: {
        label: "قيد التجهيز",
        color: "bg-blue-100 text-blue-700",
        icon: Package,
      },
      SHIPPED: {
        label: "تم الشحن",
        color: "bg-purple-100 text-purple-700",
        icon: Truck,
      },
      DELIVERED: {
        label: "تم التسليم",
        color: "bg-emerald-100 text-emerald-700",
        icon: CheckCircle,
      },
      COMPLETED: {
        label: "مكتمل",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
      },
      CANCELLED: {
        label: "ملغي",
        color: "bg-rose-100 text-rose-700",
        icon: XCircle,
      },
    };
    const config = statusMap[status] || {
      label: status,
      color: "bg-gray-100",
      icon: Clock,
    };
    const Icon = config.icon;
    return (
      <Badge className={cn("gap-1", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      PENDING: { label: "معلق", color: "bg-orange-100 text-orange-700" },
      CONFIRMED: { label: "مؤكد", color: "bg-green-100 text-green-700" },
      REJECTED: { label: "مرفوض", color: "bg-rose-100 text-rose-700" },
    };
    const { label, color } = config[status] || {
      label: status,
      color: "bg-gray-100",
    };
    return <Badge className={color}>{label}</Badge>;
  };

  const handleConfirmPayment = async () => {
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth(
        `/api/accounting/orders/${order.id}/confirm-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );
      if (res.ok) {
        toast({ title: "تم تأكيد الدفع بنجاح" });
        onOpenChange(false);
        window.location.reload();
      } else {
        const data = await res.json();
        toast({
          title: "خطأ",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectPayment = async () => {
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth(
        `/api/accounting/orders/${order.id}/confirm-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: false }),
        },
      );
      if (res.ok) {
        toast({ title: "تم رفض الدفع" });
        onOpenChange(false);
        window.location.reload();
      } else {
        const data = await res.json();
        toast({
          title: "خطأ",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ النص إلى الحافظة" });
  };

  // استخراج بيانات الدفع من JSON
  let paymentDetails: any = {};
  try {
    paymentDetails = order.paymentDetails
      ? JSON.parse(order.paymentDetails)
      : {};
  } catch (e) {
    paymentDetails = {};
  }

  const proofImage =
    paymentDetails.proofImage || paymentDetails.image || paymentDetails.receipt;
  const transferNumber =
    paymentDetails.transferNumber || paymentDetails.transactionId;
  const walletType = paymentDetails.wallet;
  const senderName = paymentDetails.customerName || paymentDetails.senderName;
  const locationLink = paymentDetails.locationLink;

  // تحديد الناشر (تاجر أو مندوب)
  const getPublisher = () => {
    for (const item of order.items) {
      if (item.product.merchant) {
        return {
          type: "تاجر",
          name: item.product.merchant.storeName,
          contact: item.product.merchant.user.name,
          phone: item.product.merchant.user.phone,
        };
      }
      if (item.product.agent) {
        return {
          type: "مندوب",
          name: item.product.agent.name,
          contact: item.product.agent.name,
          phone: null,
        };
      }
    }
    return { type: "غير معروف", name: "-", contact: "-", phone: null };
  };

  const publisher = getPublisher();

  // --- إنشاء فاتورة PDF احترافية بالعربية ---
  const generateInvoicePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF() as jsPDFWithAutoTable;

      // محاولة تحميل الخط العربي
      const fontLoaded = await loadArabicFont(doc);
      if (fontLoaded) {
        doc.setFont("Amiri");
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // دالة لرأس الصفحة
      const addHeader = () => {
        doc.setFontSize(22);
        doc.setTextColor(201, 169, 98); // ذهبي
        const title = fontLoaded ? formatArabicForPDF("تَرِ فَة") : "Tarifa";
        doc.text(title, pageWidth / 2, 20, { align: "center" });
        doc.setFontSize(14);
        doc.setTextColor(61, 48, 33);
        const subtitle = fontLoaded
          ? formatArabicForPDF("فاتورة مبيعات")
          : "Sales Invoice";
        doc.text(subtitle, pageWidth / 2, 30, { align: "center" });
      };

      addHeader();

      // معلومات الفاتورة
      doc.setFontSize(10);
      doc.setTextColor(139, 115, 85);
      const invoiceNumber = fontLoaded
        ? formatArabicForPDF(
            `رقم الفاتورة: #${order.id.slice(-8).toUpperCase()}`,
          )
        : `Invoice #: ${order.id.slice(-8).toUpperCase()}`;
      doc.text(invoiceNumber, pageWidth - 20, 45, { align: "right" });
      const invoiceDate = fontLoaded
        ? formatArabicForPDF(`التاريخ: ${formatShortDate(order.createdAt)}`)
        : `Date: ${formatShortDate(order.createdAt)}`;
      doc.text(invoiceDate, pageWidth - 20, 52, { align: "right" });

      // بيانات العميل
      doc.setFontSize(12);
      doc.setTextColor(61, 48, 33);
      const customerTitle = fontLoaded
        ? formatArabicForPDF("بيانات العميل:")
        : "Customer Info:";
      doc.text(customerTitle, 20, 65);
      doc.setFontSize(10);
      doc.setTextColor(93, 93, 93);
      const customerName = fontLoaded
        ? formatArabicForPDF(`الاسم: ${order.customer.name}`)
        : `Name: ${order.customer.name}`;
      doc.text(customerName, 20, 73);
      const customerPhone = fontLoaded
        ? formatArabicForPDF(`الهاتف: ${order.customer.phone}`)
        : `Phone: ${order.customer.phone}`;
      doc.text(customerPhone, 20, 80);
      const address = fontLoaded
        ? formatArabicForPDF(
            `العنوان: ${order.address || order.customer.address || "-"}`,
          )
        : `Address: ${order.address || order.customer.address || "-"}`;
      doc.text(address, 20, 87);
      const governorate = fontLoaded
        ? formatArabicForPDF(
            `المحافظة: ${order.governorateRel?.nameAr || order.governorate || "-"}`,
          )
        : `Governorate: ${order.governorateRel?.nameAr || order.governorate || "-"}`;
      doc.text(governorate, 20, 94);

      // جدول المنتجات
      const head = fontLoaded
        ? ["الإجمالي", "سعر الوحدة", "الكمية", "المنتج"].map((h) =>
            formatArabicForPDF(h),
          )
        : ["Total", "Unit Price", "Qty", "Product"];
      const body = order.items.map((item) => [
        formatCurrency(item.price * item.quantity),
        formatCurrency(item.price),
        item.quantity.toString(),
        fontLoaded
          ? formatArabicForPDF(item.product.nameAr)
          : item.product.nameAr,
      ]);

      autoTable(doc, {
        head: [head],
        body: body,
        startY: 105,
        theme: "grid",
        headStyles: {
          fillColor: [201, 169, 98],
          textColor: 255,
          halign: "center",
        },
        bodyStyles: {
          halign: "center",
        },
        margin: { right: 20, left: 20 },
        styles: {
          font: fontLoaded ? "Amiri" : "helvetica",
          fontSize: 10,
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // المبالغ
      doc.setFontSize(10);
      doc.setTextColor(61, 48, 33);
      const deliveryText = fontLoaded
        ? formatArabicForPDF(
            `رسوم التوصيل: ${formatCurrency(order.deliveryFee)}`,
          )
        : `Delivery Fee: ${formatCurrency(order.deliveryFee)}`;
      doc.text(deliveryText, pageWidth - 20, finalY, { align: "right" });

      doc.setFontSize(12);
      doc.setTextColor(201, 169, 98);
      const totalText = fontLoaded
        ? formatArabicForPDF(
            `الإجمالي الكلي: ${formatCurrency(order.totalAmount)}`,
          )
        : `Total: ${formatCurrency(order.totalAmount)}`;
      doc.text(totalText, pageWidth - 20, finalY + 10, { align: "right" });

      // طريقة الدفع والناشر
      doc.setFontSize(10);
      doc.setTextColor(93, 93, 93);
      const paymentMethodText = fontLoaded
        ? formatArabicForPDF(
            `طريقة الدفع: ${order.paymentMethod === "transfer" ? "حوالة بنكية" : "محفظة إلكترونية"}`,
          )
        : `Payment: ${order.paymentMethod === "transfer" ? "Bank Transfer" : "E-Wallet"}`;
      doc.text(paymentMethodText, 20, finalY + 10);

      if (transferNumber) {
        const transferText = fontLoaded
          ? formatArabicForPDF(`رقم الحوالة: ${transferNumber}`)
          : `Transfer #: ${transferNumber}`;
        doc.text(transferText, 20, finalY + 17);
      }

      const publisherText = fontLoaded
        ? formatArabicForPDF(`الناشر: ${publisher.name} (${publisher.type})`)
        : `Publisher: ${publisher.name} (${publisher.type})`;
      doc.text(publisherText, 20, finalY + 24);

      // تذييل
      doc.setFontSize(8);
      doc.setTextColor(166, 155, 141);
      const footer = fontLoaded
        ? formatArabicForPDF("شكراً لتسوقك من زينة - نتمنى لك تجربة راقية")
        : "Thank you for shopping at Tarifa";
      doc.text(footer, pageWidth / 2, pageHeight - 10, { align: "center" });

      // فتح PDF
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      toast({ title: "تم", description: "تم إنشاء الفاتورة بنجاح" });
    } catch (error) {
      console.error("PDF error:", error);
      toast({
        title: "خطأ",
        description: "فشل إنشاء الفاتورة",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  // دالة توليد محتوى HTML للطباعة (تستخدم في الطباعة وحفظ PDF)
  const generatePrintContent = () => {
    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة طلب #${order.id.slice(-8)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Tajawal', sans-serif;
            background: #FAF7F2;
            padding: 40px;
            color: #3D3021;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid #E8E0D8;
          }
          .invoice-header {
            background: linear-gradient(135deg, #3D3021 0%, #2A2116 100%);
            padding: 30px;
            color: white;
            text-align: center;
          }
          .store-name {
            font-size: 36px;
            font-weight: 700;
            color: #C9A962;
            letter-spacing: 2px;
          }
          .invoice-title {
            font-size: 20px;
            margin-top: 8px;
            opacity: 0.9;
          }
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            padding: 20px 30px;
            background: #F5EFE6;
            border-bottom: 1px solid #E8E0D8;
          }
          .section {
            padding: 25px 30px;
            border-bottom: 1px solid #E8E0D8;
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
            color: #C9A962;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .info-item {
            display: flex;
          }
          .info-label {
            width: 100px;
            color: #8B7355;
            font-weight: 500;
          }
          .info-value {
            color: #3D3021;
            font-weight: 600;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
          }
          .items-table th {
            background: #C9A962;
            color: white;
            padding: 12px 10px;
            font-weight: 600;
            text-align: center;
          }
          .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #E8E0D8;
            text-align: center;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .totals {
            margin-top: 20px;
            text-align: left;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            gap: 30px;
            margin-top: 8px;
            font-size: 16px;
          }
          .grand-total {
            font-size: 20px;
            font-weight: 700;
            color: #C9A962;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 2px solid #C9A962;
          }
          .footer {
            padding: 20px 30px;
            text-align: center;
            background: #FAF7F2;
            color: #A69B8D;
            font-size: 14px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="store-name">زينة</div>
            <div class="invoice-title">فاتورة مبيعات</div>
          </div>
          <div class="invoice-meta">
            <div>رقم الفاتورة: <strong>#${order.id.slice(-8).toUpperCase()}</strong></div>
            <div>التاريخ: <strong>${formatShortDate(order.createdAt)}</strong></div>
          </div>
          
          <div class="section">
            <div class="section-title">
              <span>👤</span> بيانات العميل
            </div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">الاسم:</span><span class="info-value">${order.customer.name}</span></div>
              <div class="info-item"><span class="info-label">الهاتف:</span><span class="info-value">${order.customer.phone}</span></div>
              <div class="info-item"><span class="info-label">البريد:</span><span class="info-value">${order.customer.email}</span></div>
              <div class="info-item"><span class="info-label">المحافظة:</span><span class="info-value">${order.governorateRel?.nameAr || order.governorate || "-"}</span></div>
              <div class="info-item" style="grid-column: span 2;"><span class="info-label">العنوان:</span><span class="info-value">${order.address || order.customer.address || "-"}</span></div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">
              <span>📦</span> المنتجات
            </div>
            <table class="items-table">
              <thead>
                <tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (item) => `
                  <tr>
                    <td style="text-align: right;">${item.product.nameAr}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>${formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            <div class="totals">
              <div class="total-row"><span>رسوم التوصيل:</span><span>${formatCurrency(order.deliveryFee)}</span></div>
              <div class="total-row grand-total"><span>الإجمالي الكلي:</span><span>${formatCurrency(order.totalAmount)}</span></div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">
              <span>💳</span> معلومات الدفع والناشر
            </div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">طريقة الدفع:</span><span class="info-value">${order.paymentMethod === "transfer" ? "حوالة بنكية" : "محفظة إلكترونية"}</span></div>
              ${transferNumber ? `<div class="info-item"><span class="info-label">رقم الحوالة:</span><span class="info-value">${transferNumber}</span></div>` : ""}
              <div class="info-item"><span class="info-label">الناشر:</span><span class="info-value">${publisher.name} (${publisher.type})</span></div>
              <div class="info-item"><span class="info-label">حالة الدفع:</span><span class="info-value">${order.paymentStatus === "CONFIRMED" ? "✅ مؤكد" : order.paymentStatus === "REJECTED" ? "❌ مرفوض" : "⏳ معلق"}</span></div>
            </div>
            ${order.notes ? `<div style="margin-top: 15px;"><span class="info-label">ملاحظات:</span><span class="info-value">${order.notes}</span></div>` : ""}
          </div>
          
          <div class="footer">
            شكراً لتسوقك من زينة - نتمنى لك تجربة راقية<br>
            للتواصل: zeinabeautyco@gmail.com | +967 780 655 615
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "خطأ",
        description: "تعذر فتح نافذة الطباعة",
        variant: "destructive",
      });
      return;
    }
    const printContent = generatePrintContent();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
  const downloadPDF = async () => {
    try {
      // 1. إنشاء حاوية مخفية تحتوي على محتوى الفاتورة
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px"; // عرض مناسب للـ PDF
      container.style.backgroundColor = "white";
      container.style.padding = "20px";
      container.style.fontFamily = "'Tajawal', sans-serif";
      container.innerHTML = generatePrintContent(); // استخدام نفس محتوى الطباعة

      document.body.appendChild(container);

      // 2. تحويل الحاوية إلى صورة باستخدام html2canvas
      const html2canvas = (await import("html2canvas")).default;
      // انتظار تحميل الخطوط والصور
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(container, {
        scale: 2.5, // دقة أعلى
        backgroundColor: "#ffffff",
        allowTaint: false,
        useCORS: true,
        logging: false,
        windowWidth: 800,
        onclone: (clonedDoc) => {
          // التأكد من تحميل الخط في النسخة المستنسخة
          const clonedContainer = clonedDoc.querySelector(".invoice-container");
          if (clonedContainer) {
            (clonedContainer as HTMLElement).style.fontFamily =
              "'Tajawal', sans-serif";
          }
        },
      });

      // إزالة الحاوية بعد الاستخدام
      document.body.removeChild(container);

      // 3. إنشاء PDF وإضافة الصورة
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

      // 4. حفظ الملف
      // اسم العميلة مع استبدال المسافات بشرطة سفلية لتجنب مشاكل الملف
      const customerName = order.customer.name.replace(/\s+/g, "_");
      const fileName = `فاتورة_${customerName}_${order.id.slice(-8)}.pdf`;
      doc.save(fileName);
      toast({ title: "تم", description: "تم تحميل الفاتورة بنجاح" });
    } catch (error) {
      console.error("PDF download error:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل الفاتورة. تأكد من تثبيت html2canvas.",
        variant: "destructive",
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-4xl h-[90vh] p-0 overflow-hidden rounded-xl"
        dir="rtl"
      >
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="text-lg md:text-xl font-bold text-[#3D3021] flex items-center gap-2">
              تفاصيل الطلب
              <span className="font-mono text-sm text-[#A69B8D]">
                #{order.id.slice(-8).toUpperCase()}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(order.status)}
              {getPaymentStatusBadge(order.paymentStatus)}
            </div>
          </div>
          <DialogDescription className="text-right text-xs md:text-sm">
            تم إنشاء الطلب في {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-4 bg-[#F5EFE6] rounded-none border-b">
            <TabsTrigger
              value="customer"
              className="text-xs md:text-sm data-[state=active]:bg-white"
            >
              العميل
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="text-xs md:text-sm data-[state=active]:bg-white"
            >
              المنتجات
            </TabsTrigger>
            <TabsTrigger
              value="payment"
              className="text-xs md:text-sm data-[state=active]:bg-white"
            >
              الدفع
            </TabsTrigger>
            <TabsTrigger
              value="publisher"
              className="text-xs md:text-sm data-[state=active]:bg-white"
            >
              الناشر
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="customer" className="mt-0 space-y-4">
              <div className="grid gap-4">
                <div className="bg-[#FAF7F2] p-4 rounded-xl">
                  <h3 className="font-bold text-[#3D3021] mb-3 flex items-center gap-2 text-sm md:text-base">
                    <User className="h-5 w-5 text-[#C9A962]" />
                    معلومات العميل
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">الاسم:</span>
                      <span className="font-medium">{order.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">البريد:</span>
                      <span className="break-all">{order.customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">الهاتف:</span>
                      <span className="font-mono" dir="ltr">
                        {order.customer.phone}
                      </span>
                    </div>
                    {order.customer.address && (
                      <div className="flex items-start gap-2">
                        <span className="w-20 text-[#8B7355]">العنوان:</span>
                        <span>{order.customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#FAF7F2] p-4 rounded-xl">
                  <h3 className="font-bold text-[#3D3021] mb-3 flex items-center gap-2 text-sm md:text-base">
                    <MapPin className="h-5 w-5 text-[#C9A962]" />
                    عنوان التوصيل
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">المحافظة:</span>
                      <span>
                        {order.governorateRel?.nameAr ||
                          order.governorate ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-20 text-[#8B7355]">العنوان:</span>
                      <span>{order.address || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">الهاتف:</span>
                      <span className="font-mono" dir="ltr">
                        {order.phone || order.customer.phone}
                      </span>
                    </div>
                    {locationLink && (
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-[#8B7355]">الموقع:</span>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-[#C9A962]"
                          onClick={() => window.open(locationLink, "_blank")}
                        >
                          فتح الموقع <ExternalLink className="mr-1 h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {order.notes && (
                  <div className="bg-[#FAF7F2] p-4 rounded-xl">
                    <h3 className="font-bold text-[#3D3021] mb-3 text-sm md:text-base">
                      ملاحظات
                    </h3>
                    <p className="text-[#5D5D5D] text-sm">{order.notes}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-0 space-y-3">
              {order.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-[#FAF7F2] p-3 md:p-4 rounded-xl"
                >
                  <div className="flex gap-3 md:gap-4">
                    <div className="h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-lg border border-[#E8E0D8] bg-white flex-shrink-0">
                      <img
                        src={item.product.mainImage}
                        alt={item.product.nameAr}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#3D3021] text-sm md:text-base truncate">
                        {item.product.nameAr}
                      </h4>
                      <p className="text-xs md:text-sm text-[#8B7355] truncate">
                        {item.product.name}
                      </p>
                      {item.product.sku && (
                        <p className="text-xs text-[#A69B8D] mt-1">
                          SKU: {item.product.sku}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          الكمية: {item.quantity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          السعر: {formatCurrency(item.price)}
                        </Badge>
                        {item.color && (
                          <Badge variant="outline" className="text-xs">
                            اللون: {item.color}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 font-bold text-[#3D3021] text-sm md:text-base">
                        الإجمالي: {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center p-2">
                <span className="text-base md:text-lg font-bold text-[#3D3021]">
                  إجمالي الطلب:
                </span>
                <span className="text-lg md:text-xl font-bold text-[#C9A962]">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="mt-0 space-y-4">
              <div className="bg-[#FAF7F2] p-4 rounded-xl">
                <h3 className="font-bold text-[#3D3021] mb-3 flex items-center gap-2 text-sm md:text-base">
                  <CreditCard className="h-5 w-5 text-[#C9A962]" />
                  معلومات الدفع
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[#8B7355]">طريقة الدفع:</span>
                    <Badge>
                      {order.paymentMethod === "transfer"
                        ? "حوالة بنكية"
                        : "محفظة إلكترونية"}
                    </Badge>
                  </div>
                  {walletType && (
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-[#8B7355]">المحفظة:</span>
                      <span>
                        {walletType === "jeib"
                          ? "جيب"
                          : walletType === "kash"
                            ? "كاش"
                            : "جوالي"}
                      </span>
                    </div>
                  )}
                  {transferNumber && (
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-[#8B7355]">رقم الحوالة:</span>
                      <span className="font-mono text-sm">
                        {transferNumber}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(transferNumber)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {senderName && (
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-[#8B7355]">اسم المرسل:</span>
                      <span>{senderName}</span>
                    </div>
                  )}
                  {paymentDetails.recipientName && (
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-[#8B7355]">اسم المستلم:</span>
                      <span>{paymentDetails.recipientName}</span>
                    </div>
                  )}
                </div>
              </div>

              {proofImage && (
                <div className="bg-[#FAF7F2] p-4 rounded-xl">
                  <h3 className="font-bold text-[#3D3021] mb-3 flex items-center gap-2 text-sm md:text-base">
                    <ImageIcon className="h-5 w-5 text-[#C9A962]" />
                    إثبات الدفع
                  </h3>
                  <div className="relative aspect-video max-w-sm mx-auto overflow-hidden rounded-lg border">
                    <img
                      src={proofImage}
                      alt="إثبات الدفع"
                      className="object-contain w-full h-full"
                    />
                  </div>
                </div>
              )}

              <div className="bg-[#FAF7F2] p-4 rounded-xl">
                <h3 className="font-bold text-[#3D3021] mb-3 text-sm md:text-base">
                  حالة الدفع
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  {getPaymentStatusBadge(order.paymentStatus)}
                  {order.paymentStatus === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleConfirmPayment}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 ml-1" />
                        )}
                        تأكيد الدفع
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRejectPayment}
                        disabled={isUpdating}
                      >
                        <XCircle className="h-4 w-4 ml-1" />
                        رفض الدفع
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="publisher" className="mt-0 space-y-4">
              <div className="bg-[#FAF7F2] p-4 rounded-xl">
                <h3 className="font-bold text-[#3D3021] mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Store className="h-5 w-5 text-[#C9A962]" />
                  الناشر ({publisher.type})
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-[#8B7355]">الاسم:</span>
                    <span className="font-medium">{publisher.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-[#8B7355]">جهة الاتصال:</span>
                    <span>{publisher.contact}</span>
                  </div>
                  {publisher.phone && (
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">الهاتف:</span>
                      <span>{publisher.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {order.agent && (
                <div className="bg-[#FAF7F2] p-4 rounded-xl">
                  <h3 className="font-bold text-[#3D3021] mb-3 flex items-center gap-2 text-sm md:text-base">
                    <UserCircle className="h-5 w-5 text-[#C9A962]" />
                    المندوب المسؤول
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">الاسم:</span>
                      <span>{order.agent.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">البريد:</span>
                      <span className="break-all">{order.agent.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[#8B7355]">الهاتف:</span>
                      <span>{order.agent.phone}</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="p-4 border-t flex flex-col sm:flex-row justify-between gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#C9A962] hover:bg-[#B8956E] text-white">
                  <Printer className="h-4 w-4 ml-1" />
                  طباعة / حفظ
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة الفاتورة
                </DropdownMenuItem>
                {/* تم تعديل هذا السطر فقط لاستدعاء downloadPDF */}
                <DropdownMenuItem onClick={downloadPDF}>
                  <Download className="h-4 w-4 ml-2" />
                  حفظ PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
