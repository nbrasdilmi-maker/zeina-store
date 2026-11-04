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

// GET /api/accounting/reports/export?type=trial-balance|income-statement&token=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type");
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

    // جلب جميع الحركات المالية
    const transactions = await db.transaction.findMany({
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      reportType === "trial-balance" ? "ميزان المراجعة" : "قائمة الدخل",
      { views: [{ rightToLeft: true }] },
    );

    let currentRow = 1;

    // الترويسة
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
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

    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const subtitleCell = worksheet.getCell(currentRow, 1);
    subtitleCell.value =
      reportType === "trial-balance" ? "ميزان المراجعة" : "قائمة الدخل";
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
      3,
      `تاريخ الإصدار: ${new Date().toLocaleDateString("ar-YE")}`,
      { size: 10, color: { argb: "FF8B7355" } },
      { horizontal: "right" },
    );
    currentRow += 2;

    if (reportType === "trial-balance") {
      // ميزان المراجعة
      const accountMap = new Map<string, { debit: number; credit: number }>();

      transactions.forEach((tx) => {
        const accountName = getAccountName(tx.type);
        const current = accountMap.get(accountName) || { debit: 0, credit: 0 };
        if (tx.amount > 0) {
          current.debit += tx.amount;
        } else {
          current.credit += Math.abs(tx.amount);
        }
        accountMap.set(accountName, current);
      });

      const items = Array.from(accountMap.entries()).map(([name, values]) => ({
        accountName: name,
        debit: values.debit,
        credit: values.credit,
      }));

      // رأس الجدول
      const headers = ["اسم الحساب", "مدين", "دائن"];
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = {
          name: "Tajawal",
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
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

      let totalDebit = 0;
      let totalCredit = 0;

      items.forEach((item) => {
        writeArabicCell(worksheet, currentRow, 1, item.accountName);
        worksheet.getCell(currentRow, 2).value =
          item.debit > 0 ? item.debit : "-";
        worksheet.getCell(currentRow, 3).value =
          item.credit > 0 ? item.credit : "-";
        totalDebit += item.debit;
        totalCredit += item.credit;
        currentRow++;
      });

      // صف الإجمالي
      worksheet.getCell(currentRow, 1).value = "الإجمالي";
      worksheet.getCell(currentRow, 2).value = totalDebit;
      worksheet.getCell(currentRow, 3).value = totalCredit;
      worksheet.getCell(currentRow, 1).font = { bold: true };
      worksheet.getCell(currentRow, 2).font = { bold: true };
      worksheet.getCell(currentRow, 3).font = { bold: true };
      currentRow += 2;

      // حالة التوازن
      const isBalanced = totalDebit === totalCredit;
      worksheet.mergeCells(currentRow, 1, currentRow, 3);
      const statusCell = worksheet.getCell(currentRow, 1);
      statusCell.value = isBalanced
        ? "✅ الميزان متوازن"
        : "❌ الميزان غير متوازن";
      statusCell.font = {
        name: "Tajawal",
        bold: true,
        color: { argb: isBalanced ? "FF10B981" : "FFEF4444" },
      };
      statusCell.alignment = { horizontal: "center", vertical: "middle" };
    } else {
      // قائمة الدخل
      const revenueMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();

      transactions.forEach((tx) => {
        const amount = Math.abs(tx.amount);
        if (tx.type === "SALE") {
          revenueMap.set(
            "المبيعات",
            (revenueMap.get("المبيعات") || 0) + amount,
          );
        } else if (tx.type === "OPERATING_EXPENSE") {
          expenseMap.set(
            "مصروفات تشغيلية",
            (expenseMap.get("مصروفات تشغيلية") || 0) + amount,
          );
        } else if (tx.type === "PURCHASE" || tx.type === "SUPPLY") {
          expenseMap.set(
            "المشتريات والتوريدات",
            (expenseMap.get("المشتريات والتوريدات") || 0) + amount,
          );
        }
      });

      const revenueItems = Array.from(revenueMap.entries()).map(
        ([cat, amt]) => ({
          category: cat,
          amount: amt,
        }),
      );
      const expenseItems = Array.from(expenseMap.entries()).map(
        ([cat, amt]) => ({
          category: cat,
          amount: amt,
        }),
      );

      const totalRevenue = revenueItems.reduce((s, i) => s + i.amount, 0);
      const totalExpense = expenseItems.reduce((s, i) => s + i.amount, 0);
      const netIncome = totalRevenue - totalExpense;

      // رأس الجدول
      const headers = ["البيان", "المبلغ"];
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = {
          name: "Tajawal",
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
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

      // الإيرادات
      revenueItems.forEach((item) => {
        writeArabicCell(worksheet, currentRow, 1, item.category);
        worksheet.getCell(currentRow, 2).value = item.amount;
        worksheet.getCell(currentRow, 2).font = { color: { argb: "FF10B981" } };
        currentRow++;
      });

      worksheet.getCell(currentRow, 1).value = "إجمالي الإيرادات";
      worksheet.getCell(currentRow, 2).value = totalRevenue;
      worksheet.getCell(currentRow, 1).font = { bold: true };
      worksheet.getCell(currentRow, 2).font = {
        bold: true,
        color: { argb: "FF10B981" },
      };
      currentRow += 2;

      // المصروفات
      expenseItems.forEach((item) => {
        writeArabicCell(worksheet, currentRow, 1, item.category);
        worksheet.getCell(currentRow, 2).value = item.amount;
        worksheet.getCell(currentRow, 2).font = { color: { argb: "FFEF4444" } };
        currentRow++;
      });

      worksheet.getCell(currentRow, 1).value = "إجمالي المصروفات";
      worksheet.getCell(currentRow, 2).value = totalExpense;
      worksheet.getCell(currentRow, 1).font = { bold: true };
      worksheet.getCell(currentRow, 2).font = {
        bold: true,
        color: { argb: "FFEF4444" },
      };
      currentRow += 2;

      // صافي الربح/الخسارة
      worksheet.getCell(currentRow, 1).value = "صافي الربح / الخسارة";
      worksheet.getCell(currentRow, 2).value = netIncome;
      worksheet.getCell(currentRow, 1).font = { bold: true, size: 14 };
      worksheet.getCell(currentRow, 2).font = {
        bold: true,
        size: 14,
        color: { argb: netIncome >= 0 ? "FF10B981" : "FFEF4444" },
      };
    }

    // تذييل
    currentRow += 2;
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const footerCell = worksheet.getCell(currentRow, 1);
    footerCell.value = "تم إنشاء هذا التقرير بواسطة النظام المحاسبي لتِرفة";
    footerCell.font = {
      name: "Tajawal",
      size: 10,
      italic: true,
      color: { argb: "FFA69B8D" },
    };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${reportType === "trial-balance" ? "ميزان_المراجعة" : "قائمة_الدخل"}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error("Reports export error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تصدير التقرير" },
      { status: 500 },
    );
  }
}

function getAccountName(type: string): string {
  const names: Record<string, string> = {
    SALE: "المبيعات",
    COLLECTION: "التحصيلات",
    PURCHASE: "المشتريات",
    SUPPLY: "التوريدات",
    RETURN: "المرتجعات",
    OPERATING_EXPENSE: "المصروفات التشغيلية",
  };
  return names[type] || type;
}
