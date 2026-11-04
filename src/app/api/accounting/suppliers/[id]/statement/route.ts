import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// دالة مساعدة لكتابة نص عربي بشكل صحيح في Excel
const writeArabicCell = (
  worksheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  text: string,
  font?: Partial<ExcelJS.Font>,
  alignment?: Partial<ExcelJS.Alignment>,
) => {
  const cell = worksheet.getCell(row, col);
  cell.value = text;
  cell.font = {
    name: "Tajawal",
    size: 12,
    ...font,
  };
  cell.alignment = {
    horizontal: "right",
    vertical: "middle",
    wrapText: true,
    readingOrder: "rtl",
    ...alignment,
  };
};

// GET /api/accounting/suppliers/[id]/statement - تصدير كشف حساب Excel احترافي
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. التحقق من التوكن (كما في الكود السابق)
    const { searchParams } = new URL(request.url);
    let token = searchParams.get("token");

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: "غير مصرح - التوكن مفقود" },
        { status: 401 },
      );
    }

    const { verifyToken } = await import("@/lib/auth");
    const result = verifyToken(token);

    if (!result.valid || !result.payload?.userId) {
      return NextResponse.json({ error: "التوكن غير صالح" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: result.payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // 2. جلب بيانات المورد
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true, role: true } },
        suppliedProducts: {
          include: {
            orderItems: {
              include: {
                order: {
                  select: {
                    id: true,
                    createdAt: true,
                    customer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "المورد غير موجود" }, { status: 404 });
    }

    const commissionRate = supplier.commission || 0;

    // 3. إنشاء Workbook و Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("كشف حساب", {
      views: [{ rightToLeft: true }],
    });

    // تعريف الأعمدة (لأغراض العرض فقط)
    worksheet.columns = [
      { width: 25 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    let currentRow = 1;

    // --- الترويسة ---
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = "زينة";
    titleCell.font = {
      name: "Tajawal",
      size: 28,
      bold: true,
      color: { argb: "FFC9A962" },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow++;

    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    const subtitleCell = worksheet.getCell(currentRow, 1);
    subtitleCell.value = "كشف حساب مورد";
    subtitleCell.font = {
      name: "Tajawal",
      size: 16,
      bold: true,
      color: { argb: "FF3D3021" },
    };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 2;

    // تاريخ الإصدار
    writeArabicCell(
      worksheet,
      currentRow,
      7,
      `تاريخ الإصدار: ${new Date().toLocaleDateString("ar-YE")}`,
      { size: 10, color: { argb: "FF8B7355" } },
      { horizontal: "right" },
    );
    currentRow += 2;

    // --- بيانات المورد ---
    writeArabicCell(worksheet, currentRow, 1, "بيانات المورد", {
      bold: true,
      size: 14,
      color: { argb: "FFC9A962" },
    });
    currentRow++;

    const supplierInfo = [
      ["الاسم", supplier.name],
      [
        "النوع",
        supplier.type === "MERCHANT"
          ? "تاجر"
          : supplier.type === "AGENT"
            ? "مندوب"
            : "إدارة",
      ],
      ["نسبة العمولة", `${commissionRate}%`],
    ];
    if (supplier.contactInfo)
      supplierInfo.push(["معلومات الاتصال", supplier.contactInfo]);
    if (supplier.user?.phone)
      supplierInfo.push(["الهاتف", supplier.user.phone]);
    if (supplier.user?.email)
      supplierInfo.push(["البريد", supplier.user.email]);

    supplierInfo.forEach(([label, value]) => {
      writeArabicCell(worksheet, currentRow, 1, label, {
        bold: true,
        color: { argb: "FF8B7355" },
      });
      writeArabicCell(worksheet, currentRow, 2, value, {
        color: { argb: "FF3D3021" },
      });
      currentRow++;
    });
    currentRow++;

    // --- ملخص المنتجات ---
    writeArabicCell(worksheet, currentRow, 1, "ملخص المنتجات", {
      bold: true,
      size: 14,
      color: { argb: "FFC9A962" },
    });
    currentRow++;

    const summaryHeaders = [
      "اسم المنتج",
      "سعر البيع",
      "الكمية المباعة",
      "إجمالي المبيعات",
      "العمولة",
    ];
    summaryHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { name: "Tajawal", bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC9A962" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    currentRow++;

    let totalSales = 0;
    let totalCommission = 0;

    for (const product of supplier.suppliedProducts) {
      const productSales = product.orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const productQuantity = product.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const productCommission = productSales * (commissionRate / 100);

      totalSales += productSales;
      totalCommission += productCommission;

      if (productSales > 0) {
        writeArabicCell(worksheet, currentRow, 1, product.nameAr);
        writeArabicCell(
          worksheet,
          currentRow,
          2,
          `${product.price.toFixed(2)} ر.ي`,
        );
        worksheet.getCell(currentRow, 3).value = productQuantity;
        writeArabicCell(
          worksheet,
          currentRow,
          4,
          `${productSales.toFixed(2)} ر.ي`,
        );
        writeArabicCell(
          worksheet,
          currentRow,
          5,
          `${productCommission.toFixed(2)} ر.ي`,
        );
        currentRow++;
      }
    }

    // صف الإجمالي
    worksheet.getCell(currentRow, 4).value = `${totalSales.toFixed(2)} ر.ي`;
    worksheet.getCell(currentRow, 5).value =
      `${totalCommission.toFixed(2)} ر.ي`;
    worksheet.getCell(currentRow, 4).font = { bold: true };
    worksheet.getCell(currentRow, 5).font = { bold: true };
    currentRow++;

    // صافي المستحقات
    worksheet.getCell(currentRow, 5).value =
      `${(totalSales - totalCommission).toFixed(2)} ر.ي`;
    worksheet.getCell(currentRow, 5).font = {
      bold: true,
      color: { argb: "FFC9A962" },
    };
    writeArabicCell(worksheet, currentRow, 4, "صافي المستحقات", { bold: true });
    currentRow += 2;

    // --- تفاصيل عمليات البيع ---
    writeArabicCell(worksheet, currentRow, 1, "تفاصيل عمليات البيع", {
      bold: true,
      size: 14,
      color: { argb: "FFC9A962" },
    });
    currentRow++;

    const detailHeaders = [
      "رقم الطلب",
      "التاريخ",
      "العميل",
      "المنتج",
      "الكمية",
      "سعر الوحدة",
      "الإجمالي",
      "العمولة",
    ];
    detailHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { name: "Tajawal", bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC9A962" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    currentRow++;

    for (const product of supplier.suppliedProducts) {
      for (const item of product.orderItems) {
        const itemTotal = item.price * item.quantity;
        const itemCommission = itemTotal * (commissionRate / 100);
        worksheet.getCell(currentRow, 1).value = item.order.id.slice(-8);
        worksheet.getCell(currentRow, 2).value = new Date(
          item.order.createdAt,
        ).toLocaleDateString("ar-YE");
        writeArabicCell(
          worksheet,
          currentRow,
          3,
          item.order.customer?.name || "—",
        );
        writeArabicCell(worksheet, currentRow, 4, product.nameAr);
        worksheet.getCell(currentRow, 5).value = item.quantity;
        worksheet.getCell(currentRow, 6).value = `${item.price.toFixed(2)} ر.ي`;
        worksheet.getCell(currentRow, 7).value = `${itemTotal.toFixed(2)} ر.ي`;
        worksheet.getCell(currentRow, 8).value =
          `${itemCommission.toFixed(2)} ر.ي`;
        currentRow++;
      }
    }

    // --- تذييل ---
    currentRow += 2;
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    const footerCell = worksheet.getCell(currentRow, 1);
    footerCell.value = "شكراً لتعاملكم مع زينة - نتمنى لكم تجارة راقية";
    footerCell.font = {
      name: "Tajawal",
      size: 10,
      italic: true,
      color: { argb: "FFA69B8D" },
    };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };

    // 4. توليد الملف وإرساله
    const buffer = await workbook.xlsx.writeBuffer();

    const fileName = `كشف_حساب_${supplier.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error("Supplier statement error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء كشف الحساب" },
      { status: 500 },
    );
  }
}
