"use client";

import { useState, useEffect, type ReactElement } from "react";
import { pusherClient } from "@/lib/pusher";
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Package,
  ImageIcon,
  Phone,
  ExternalLink,
  Users,
  MapPin,
  DollarSign,
  ShoppingBag,
  Tag,
  Store,
  Truck,
  BadgeCheck, // أضف Truck و BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminOrdersTabProps {
  orders: any[];
  onRefresh: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => ReactElement;
}

export function AdminOrdersTab({
  orders,
  onRefresh,
  onUpdateStatus,
  formatCurrency,
  formatDate,
  getStatusBadge,
}: AdminOrdersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PENDING, CANCELLED, etc.
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  // الاستماع للإشعارات اللحظية لتحديث الجدول تلقائياً
  useEffect(() => {
    // Pusher معطّل في وضع التجربة المحلي؛ نحمي الاستدعاء حتى لا ينهار التبويب.
    if (!pusherClient) return;

    const channel = pusherClient.subscribe("tarfah-public-channel");

    channel.bind("new-notification", () => {
      // أول ما يوصل إشعار جديد، نحدث الجدول فوراً بالخلفية
      onRefresh();
    });

    return () => {
      pusherClient.unsubscribe("tarfah-public-channel");
    };
  }, [onRefresh]);

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();

    // أولاً: منطق البحث (بالاسم أو الكود أو الرقم)
    const matchesSearch =
      order.id.toLowerCase().includes(searchLower) ||
      (order.customer?.name || "").toLowerCase().includes(searchLower) ||
      order.items?.some(
        (item: any) =>
          (item.product?.nameAr || "").toLowerCase().includes(searchLower) ||
          (item.product?.sku || "").toLowerCase().includes(searchLower),
      );

    // ثانياً: منطق الفلترة حسب الحالة (الكل، انتظار، مقبول، مرفوض)
    const matchesStatus =
      statusFilter === "ALL" ? true : order.status === statusFilter;

    // يجب أن يتحقق الشرطان معاً
    return matchesSearch && matchesStatus;
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 pb-4">
        <CardTitle>إدارة الطلبات ({filteredOrders.length})</CardTitle>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث (طلب، اسم، كود منتج)..."
              className="pr-10 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {/* شريط أزرار الفلترة الجديد */}
        <div className="flex gap-2 overflow-x-auto pb-2 w-full mt-4 border-t pt-4 no-scrollbar">
          {[
            { id: "ALL", label: "الكل", color: "bg-gray-100 text-gray-700" },
            {
              id: "PENDING",
              label: "قيد الانتظار",
              color: "bg-yellow-100 text-yellow-700",
            },
            {
              id: "PROCESSING",
              label: "مقبولة",
              color: "bg-blue-100 text-blue-700",
            },
            {
              id: "CANCELLED",
              label: "المرفوضة",
              color: "bg-red-100 text-red-700",
            },
          ].map((btn) => (
            <Button
              key={btn.id}
              variant={statusFilter === btn.id ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(btn.id)}
              className={`h-8 text-[11px] font-bold rounded-full transition-all ${
                statusFilter === btn.id
                  ? "bg-[var(--gold-dark)] text-white shadow-md scale-105"
                  : `border-none ${btn.color} hover:opacity-80`
              }`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* تم إصلاح التمرير الأفقي والعمودي هنا ليظهر للجميع */}
        <div className="w-full rounded-lg border border-gray-100 shadow-sm overflow-hidden bg-white">
          <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[90px]">رقم الطلب</TableHead>
                  <TableHead className="w-[150px]">العميلة</TableHead>
                  <TableHead className="w-[280px]">
                    المنتجات والمورد (SKU)
                  </TableHead>
                  <TableHead className="w-[120px]">الحالة</TableHead>
                  <TableHead className="w-[120px]">المبلغ</TableHead>
                  <TableHead className="w-[120px]">التاريخ</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="font-mono text-[11px] font-bold">
                      #{order.id.slice(-6)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">
                          {order.customer?.name}
                        </span>
                        <span className="text-[10px] text-gray-500" dir="ltr">
                          {order.customer?.phone}
                        </span>
                      </div>
                    </TableCell>

                    {/* عمود المنتجات والمورد الجديد ليظهر في الجدول مباشرة */}
                    <TableCell>
                      <div className="flex flex-col gap-1.5 max-w-[280px]">
                        {order.items?.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="bg-gray-50 p-1.5 rounded border border-gray-200 text-xs"
                          >
                            <p
                              className="font-bold text-gray-800 truncate"
                              title={item.product?.nameAr}
                            >
                              {item.product?.nameAr || "منتج محذوف"}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <span
                                className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1 rounded border border-purple-100 select-all"
                                title="انقر للنسخ"
                              >
                                {item.product?.sku || "بدون كود"}
                              </span>
                              <span className="text-[10px] font-bold text-orange-700">
                                👤{" "}
                                {item.product?.merchant?.storeName ||
                                  item.product?.agent?.name ||
                                  "الإدارة"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(order.status)}
                        {/* إظهار المندوب الذي استلم الطلب إن وجد */}
                        {order.agent && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-purple-50 text-purple-700 border-purple-200"
                          >
                            👤 المجهز: {order.agent.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-blue-700">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-[10px] text-gray-400">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* زر عرض التفاصيل (العين) */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedOrder(order)}
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>

                        {/* أزرار تغيير الحالة حسب الحالة الحالية */}
                        {order.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                            onClick={() =>
                              onUpdateStatus(order.id, "PROCESSING")
                            }
                            title="استلام وبدء التجهيز"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        )}

                        {order.status === "PROCESSING" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50"
                              onClick={() =>
                                onUpdateStatus(order.id, "SHIPPED")
                              }
                              title="تم الشحن"
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                              onClick={() =>
                                onUpdateStatus(order.id, "DELIVERED")
                              }
                              title="تم التسليم"
                            >
                              <BadgeCheck className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {order.status === "SHIPPED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                            onClick={() =>
                              onUpdateStatus(order.id, "DELIVERED")
                            }
                            title="تأكيد التسليم"
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </Button>
                        )}

                        {order.status === "CANCELLED" && (
                          <Badge
                            variant="destructive"
                            className="text-xs px-2 py-1"
                          >
                            ملغي
                          </Badge>
                        )}

                        {order.status === "DELIVERED" && (
                          <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                            مكتمل
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* نافذة تفاصيل الطلب المتطورة - شاملة لبيانات الحساب وبيانات الواتساب كاملة */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-0 border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-gray-50/50">
            <DialogTitle className="flex justify-between items-center text-base font-black">
              <span className="flex items-center gap-2 text-purple-900">
                <Package className="h-5 w-5" /> تفاصيل الطلب #
                {selectedOrder?.id.slice(-8)}
              </span>
              {getStatusBadge(selectedOrder?.status || "")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              عرض شامل لكل بيانات الحساب وبيانات التوصيل ورسالة الواتساب
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="p-4 space-y-6">
              {/* --- القسم الأول: بيانات صاحب الحساب (التي لم نحذفها بناءً على أمرك) --- */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="font-bold text-gray-700 text-xs border-b pb-2 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> بيانات الحساب المسجل:
                </p>
                <div className="text-sm space-y-1">
                  <p>
                    •{" "}
                    <span className="font-medium text-gray-500">
                      الاسم في النظام:
                    </span>{" "}
                    {selectedOrder.customer?.name}
                  </p>
                  <p>
                    •{" "}
                    <span className="font-medium text-gray-500">
                      رقم الهاتف المسجل:
                    </span>{" "}
                    <span dir="ltr">{selectedOrder.customer?.phone}</span>
                  </p>
                  <p>
                    •{" "}
                    <span className="font-medium text-gray-500">
                      البريد الإلكتروني:
                    </span>{" "}
                    {selectedOrder.customer?.email || "غير متوفر"}
                  </p>
                </div>
              </div>

              {/* --- القسم الثاني: بيانات التوصيل الفعلية (مطابقة لرسالة الواتساب) --- */}
              <div className="space-y-3 bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-md">
                <p className="font-black text-purple-900 text-sm flex items-center gap-2 border-b border-purple-200 pb-2">
                  <ExternalLink className="h-5 w-5" /> 📄 بيانات العميل (كما في
                  الطلب):
                </p>

                {(() => {
                  let pData: any = {};
                  try {
                    pData =
                      typeof selectedOrder.paymentDetails === "string"
                        ? JSON.parse(selectedOrder.paymentDetails)
                        : selectedOrder.paymentDetails || {};
                  } catch (e) {}

                  // جلب البيانات الفعلية التي دخلت في رسالة الواتساب
                  const actualName =
                    pData.customerName || selectedOrder.customer?.name;
                  const actualPhone =
                    (selectedOrder as any).phone ||
                    selectedOrder.customer?.phone;
                  const actualProvince =
                    (selectedOrder as any).governorate || "غير محدد";
                  const actualAddress =
                    selectedOrder.address || selectedOrder.customer?.address;

                  return (
                    <div className="text-sm space-y-3">
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-100">
                        <span className="font-bold text-gray-600">
                          👤 الاسم:
                        </span>
                        <span className="font-black text-purple-900">
                          {actualName}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-100">
                        <span className="font-bold text-gray-600">
                          📞 الهاتف:
                        </span>
                        <span className="font-black text-blue-700" dir="ltr">
                          {actualPhone}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-100">
                        <span className="font-bold text-gray-600">
                          📍 المحافظة:
                        </span>
                        <span className="font-black text-red-700">
                          {actualProvince}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 bg-white p-2 rounded-lg border border-purple-100">
                        <span className="font-bold text-gray-600">
                          🏠 العنوان بالتفصيل:
                        </span>
                        <span className="font-medium text-gray-800 leading-relaxed">
                          {actualAddress}
                        </span>
                      </div>

                      {/* رابط الموقع (الخريطة) */}
                      <div className="pt-2">
                        <p className="font-bold text-gray-700 mb-1 flex items-center gap-2">
                          📍 الموقع الجغرافي:
                        </p>
                        {pData.locationLink ? (
                          <Button
                            variant="outline"
                            className="w-full bg-blue-50 border-blue-300 text-blue-700 font-black hover:bg-blue-100 gap-2 h-10"
                            onClick={() =>
                              window.open(pData.locationLink, "_blank")
                            }
                          >
                            <MapPin className="h-4 w-4" /> فتح موقع العميل في
                            خرائط جوجل
                          </Button>
                        ) : (
                          <div className="text-gray-400 italic bg-gray-100 p-2 rounded text-center text-xs">
                            لم يتم مشاركة الموقع (تم إدخال العنوان نصاً)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* --- القسم الثالث: المنتجات المطلوبة (مع الألوان والصور) --- */}
              <div className="space-y-3">
                <p className="font-black text-gray-800 text-sm px-1 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-green-600" /> 📦 المنتجات
                  المطلوبة:
                </p>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item: any, idx: number) => {
                    const productTotal = item.price * item.quantity;
                    const uploaderName =
                      item.product?.merchant?.storeName ||
                      item.product?.agent?.name ||
                      "الإدارة الأساسية";
                    return (
                      <div
                        key={idx}
                        className="flex gap-4 p-3 bg-white rounded-xl border-2 border-gray-100 shadow-sm hover:border-purple-200 transition-all"
                      >
                        <div className="relative">
                          <img
                            src={item.product?.mainImage}
                            className="w-20 h-20 object-cover rounded-lg border shadow-sm"
                            alt="product"
                          />
                          <Badge className="absolute -top-2 -right-2 bg-purple-700 text-white font-bold h-6 w-6 rounded-full flex items-center justify-center p-0">
                            {item.quantity}
                          </Badge>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-black text-sm text-gray-900 truncate">
                            {item.product?.nameAr}
                          </p>
                          <p className="text-[11px] font-mono text-gray-500 mt-1 flex items-center gap-1">
                            <Tag className="h-3 w-3" /> كود (SKU):{" "}
                            <span className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded border select-all">
                              {item.product?.sku || "لا يوجد كود"}
                            </span>
                          </p>
                          <p className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1">
                            <Store className="h-3 w-3 text-orange-600" />{" "}
                            المورد:{" "}
                            <span className="text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200">
                              {uploaderName}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 font-bold">
                            السعر الفردي:{" "}
                            <span className="text-purple-600">
                              {formatCurrency(item.price)}
                            </span>
                          </p>
                          {item.color && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] font-bold text-gray-400">
                                اللون المختار:
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[11px] font-black bg-blue-50 text-blue-700 border-blue-100 px-2 py-0"
                              >
                                {item.color}
                              </Badge>
                            </div>
                          )}
                          <div className="pt-1 flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 font-medium">
                              إجمالي الصنف:
                            </span>
                            <span className="font-bold text-sm text-gray-900">
                              {formatCurrency(productTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* --- القسم الرابع: الملخص المالي (مطابق للواتساب) --- */}
              <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200 space-y-3 shadow-inner">
                <p className="font-black text-green-900 text-sm border-b border-green-200 pb-2">
                  💰 الملخص المالي للطلب:
                </p>

                {(() => {
                  const productsValue =
                    selectedOrder.items?.reduce(
                      (sum: number, item: any) =>
                        sum + item.price * item.quantity,
                      0,
                    ) || 0;
                  const deliveryFee = selectedOrder.totalAmount - productsValue;

                  return (
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between text-gray-700 font-bold">
                        <span>• قيمة المنتجات:</span>
                        <span>{formatCurrency(productsValue)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700 font-bold">
                        <span>• رسوم التوصيل:</span>
                        <span className="text-red-600">
                          {formatCurrency(deliveryFee)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-green-200 mt-2">
                        <span className="font-black text-green-950 text-lg">
                          💰 الإجمالي الكلي:
                        </span>
                        <span className="font-black text-2xl text-green-700">
                          {formatCurrency(selectedOrder.totalAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* --- القسم الخامس: بيانات الدفع والتحقق (مطابق للواتساب) --- */}
              <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200 space-y-4 shadow-sm">
                <p className="font-black text-orange-900 text-sm flex items-center gap-2 border-b border-orange-200 pb-2">
                  <DollarSign className="h-5 w-5" /> بيانات الدفع والتحقق:
                </p>

                {(() => {
                  let pData: any = {};
                  try {
                    pData =
                      typeof selectedOrder.paymentDetails === "string"
                        ? JSON.parse(selectedOrder.paymentDetails)
                        : selectedOrder.paymentDetails || {};
                  } catch (e) {}

                  const methodText =
                    selectedOrder.paymentMethod === "transfer"
                      ? "حوالة صرافة"
                      : pData.wallet
                        ? `محفظة (${pData.wallet === "jeib" ? "جيب" : pData.wallet === "kash" ? "كاش" : "جوالي"})`
                        : "غير محدد";

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm font-black text-orange-950">
                        <span>💳 طريقة الدفع:</span>
                        <Badge className="bg-orange-600 text-white">
                          {methodText}
                        </Badge>
                      </div>

                      {pData.transferNumber && (
                        <div className="flex justify-between items-center text-sm font-bold text-gray-700">
                          <span>🔢 رقم الحوالة:</span>
                          <span className="text-blue-700">
                            {pData.transferNumber}
                          </span>
                        </div>
                      )}

                      {pData.proofImage && (
                        <div className="space-y-2 pt-2 border-t border-orange-200">
                          <p className="font-bold text-gray-700 text-xs text-center mb-2">
                            📸 صورة إثبات الدفع المرفقة:
                          </p>
                          <div className="relative group">
                            <img
                              src={pData.proofImage}
                              className="w-full h-40 object-cover rounded-lg border-2 border-orange-200 shadow-sm cursor-pointer"
                              alt="proof"
                              onClick={() =>
                                window.open(pData.proofImage, "_blank")
                              }
                            />
                            <div
                              className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                              onClick={() =>
                                window.open(pData.proofImage, "_blank")
                              }
                            >
                              <Eye className="text-white h-8 w-8" />
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-white border-orange-400 text-orange-700 font-black hover:bg-orange-100 mt-2 h-10 gap-2"
                            onClick={() =>
                              window.open(pData.proofImage, "_blank")
                            }
                          >
                            <ImageIcon className="h-5 w-5" /> عرض الصورة بحجم
                            كامل
                          </Button>
                        </div>
                      )}

                      {/* أزرار الأكشن النهائية */}
                      {selectedOrder.status === "PENDING" && (
                        <div className="flex gap-3 pt-2">
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 shadow-lg h-12 font-black text-base"
                            onClick={() => {
                              onUpdateStatus(selectedOrder.id, "PROCESSING");
                              setSelectedOrder(null);
                            }}
                          >
                            <CheckCircle className="h-5 w-5 ml-2" /> تأكيد
                            واستلام
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1 shadow-lg h-12 font-black text-base"
                            onClick={() => {
                              onUpdateStatus(selectedOrder.id, "CANCELLED");
                              setSelectedOrder(null);
                            }}
                          >
                            <XCircle className="h-5 w-5 ml-2" /> رفض الطلب
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* --- القسم الأخير: ملاحظات العميل --- */}
              <div className="pt-4 border-t-2 border-gray-100 flex flex-col items-center gap-2">
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest italic">
                  -- الملاحظات الإضافية --
                </p>
                <div className="bg-gray-50 p-3 rounded-lg w-full text-center border border-dashed border-gray-300">
                  <p className="text-gray-600 font-medium text-sm">
                    {selectedOrder.notes
                      ? `📝 ${selectedOrder.notes}`
                      : "لا توجد ملاحظات خاصة بهذا الطلب"}
                  </p>
                </div>
                <p className="text-[10px] text-gray-300 font-mono mt-4">
                  رقم الطلب المرجعي: {selectedOrder.id}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
