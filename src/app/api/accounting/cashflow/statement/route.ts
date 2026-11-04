import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

// دالة مساعدة لكتابة نص عربي في Excel
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

// GET /api/accounting/cashflow/statement - تصدير كشف حساب الصندوق Excel احترافي
export async function GET(request: NextRequest) {
  try {
    // 1. التحقق من التوكن
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

    // 2. جلب الحركات المالية
    const transactions = await db.transaction.findMany({
      include: {
        supplier: { select: { name: true, type: true } },
        order: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. حساب الإحصائيات
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalPurchases = 0;
    let totalReturns = 0;

    transactions.forEach((t) => {
      const amount = t.amount;
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpenses += Math.abs(amount);
      }
      if (t.type === "PURCHASE" || t.type === "SUPPLY") {
        totalPurchases += Math.abs(amount);
      }
      if (t.type === "RETURN") {
        totalReturns += Math.abs(amount);
      }
    });

    const currentBalance = totalIncome - totalExpenses;

    // 4. إنشاء Workbook و Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("كشف حساب الصندوق", {
      views: [{ rightToLeft: true }],
    });

    worksheet.columns = [
      { width: 25 },
      { width: 20 },
      { width: 20 },
      { width: 30 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    let currentRow = 1;

    // --- الترويسة ---
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
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

    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    const subtitleCell = worksheet.getCell(currentRow, 1);
    subtitleCell.value = "كشف حساب الصندوق";
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
      6,
      `تاريخ الإصدار: ${new Date().toLocaleDateString("ar-YE")}`,
      { size: 10, color: { argb: "FF8B7355" } },
      { horizontal: "right" },
    );
    currentRow += 2;

    // --- ملخص الأرصدة ---
    writeArabicCell(worksheet, currentRow, 1, "ملخص الصندوق", {
      bold: true,
      size: 14,
      color: { argb: "FFC9A962" },
    });
    currentRow++;

    const summaryData = [
      ["الرصيد الحالي", `${currentBalance.toFixed(2)} ر.ي`],
      ["إجمالي الإيرادات", `${totalIncome.toFixed(2)} ر.ي`],
      ["إجمالي المصروفات", `${totalExpenses.toFixed(2)} ر.ي`],
      ["إجمالي المشتريات والتوريدات", `${totalPurchases.toFixed(2)} ر.ي`],
      ["إجمالي المرتجعات", `${totalReturns.toFixed(2)} ر.ي`],
    ];

    summaryData.forEach(([label, value]) => {
      writeArabicCell(worksheet, currentRow, 1, label, {
        bold: true,
        color: { argb: "FF8B7355" },
      });
      writeArabicCell(worksheet, currentRow, 2, value, {
        bold: label === "الرصيد الحالي",
        color: { argb: "FF3D3021" },
      });
      currentRow++;
    });
    currentRow++;

    // --- تفاصيل العمليات ---
    writeArabicCell(worksheet, currentRow, 1, "سجل العمليات المالية", {
      bold: true,
      size: 14,
      color: { argb: "FFC9A962" },
    });
    currentRow++;

    const detailHeaders = [
      "رقم المرجع",
      "النوع",
      "البيان",
      "المورد/التاجر",
      "التاريخ",
      "المبلغ",
      "الرصيد التراكمي",
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

    let runningBalance = 0;
    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        SALE: "مبيعات",
        COLLECTION: "تحصيل",
        PURCHASE: "مشتريات",
        SUPPLY: "توريد",
        RETURN: "مرتجعات",
        OPERATING_EXPENSE: "مصروف تشغيلي",
      };
      return labels[type] || type;
    };

    for (const tx of transactions) {
      runningBalance += tx.amount;
      const amountFormatted = `${tx.amount > 0 ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)} ر.ي`;
      const balanceFormatted = `${runningBalance.toFixed(2)} ر.ي`;

      worksheet.getCell(currentRow, 1).value =
        tx.referenceNumber || tx.id.slice(-8);
      worksheet.getCell(currentRow, 2).value = getTypeLabel(tx.type);
      writeArabicCell(worksheet, currentRow, 3, tx.description || "-");
      writeArabicCell(
        worksheet,
        currentRow,
        4,
        tx.supplier?.name || (tx.order ? `طلب #${tx.order.id.slice(-8)}` : "-"),
      );
      worksheet.getCell(currentRow, 5).value = new Date(
        tx.createdAt,
      ).toLocaleDateString("ar-YE");
      writeArabicCell(worksheet, currentRow, 6, amountFormatted, {
        color: { argb: tx.amount > 0 ? "FF10B981" : "FFEF4444" },
        bold: true,
      });
      writeArabicCell(worksheet, currentRow, 7, balanceFormatted, {
        bold: true,
      });
      currentRow++;
    }

    // --- تذييل ---
    currentRow += 2;
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    const footerCell = worksheet.getCell(currentRow, 1);
    footerCell.value =
      "تم إنشاء هذا التقرير بواسطة النظام المحاسبي لتِرفة - جميع الحقوق محفوظة";
    footerCell.font = {
      name: "Tajawal",
      size: 10,
      italic: true,
      color: { argb: "FFA69B8D" },
    };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };

    // 5. توليد الملف
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `كشف_حساب_الصندوق_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error("Cashflow statement error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء كشف الحساب" },
      { status: 500 },
    );
  }
}
