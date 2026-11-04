"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Store,
  Truck,
  User,
  ArrowRight,
  LogOut,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface RoleSelectorProps {
  onRoleSelected: (role: string) => void;
  className?: string;
}

interface RoleOption {
  value: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "ADMIN",
    label: "مدير المتجر",
    description: "الإدارة الكاملة للمنتجات، الطلبات، التجار، المحاسبة والإعدادات",
    icon: Shield,
    color: "bg-[#3D3021] text-white",
  },
  {
    value: "MERCHANT",
    label: "تاجر",
    description: "إدارة متجرك الخاص، منتجاتك، مبيعاتك، وطلبات عملائك",
    icon: Store,
    color: "bg-[#C9A962] text-white",
  },
  {
    value: "AGENT",
    label: "مندوب",
    description: "إدارة طلباتك، التواصل مع العملاء، وتحديث حالات التوصيل",
    icon: Truck,
    color: "bg-[#8B7355] text-white",
  },
  {
    value: "CUSTOMER",
    label: "عميل",
    description: "تصفح المنتجات، إضافة للسلة، إنشاء الطلبات، والمفضلة",
    icon: User,
    color: "bg-[#B8956E] text-white",
  },
];

export function RoleSelector({ onRoleSelected, className }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectRole = useCallback(async (role: string) => {
    setSelectedRole(role);
    setIsLoading(true);

    try {
      const response = await fetch("/api/demo/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "خطأ",
          description: data.error || "فشل إنشاء جلسة التجريبي",
          variant: "destructive",
        });
        setIsLoading(false);
        setSelectedRole(null);
        return;
      }

      // Store demo session data in localStorage
      localStorage.setItem("demo_user", JSON.stringify({
        id: data.userId,
        name: data.role === "ADMIN" ? "مدير التجريبي" : data.role === "MERCHANT" ? "تاجر تجريبي" : data.role === "AGENT" ? "مندوب تجريبي" : "عميل تجريبي",
        email: data.sessionId + "@zeina.store",
        role: data.role,
        isVerified: true,
      }));
      localStorage.setItem("demo_token", data.token);
      localStorage.setItem("demo_session_id", data.sessionId);
      // Dashboards read the generic "token" key, and ordinary page fetches
      // rely on the cookie fallback so the storefront stays session-scoped.
      localStorage.setItem("token", data.token);
      document.cookie = `token=${encodeURIComponent(data.token)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      toast({
        title: "مرحباً بك",
        description: `تم دخولك في وضع التجريبي بدور: ${ROLE_OPTIONS.find(r => r.value === role)?.label}`,
      });

      onRoleSelected(data.role);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال بالخادم",
        variant: "destructive",
      });
      setIsLoading(false);
      setSelectedRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [onRoleSelected]);

  return (
    <div className={className}>
      <AnimatePresence>
        {!selectedRole && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6] p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl"
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C9A962] text-white mb-4">
                  <Shield className="h-8 w-8" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
                  زينة
                </h1>
                <p className="text-[#8B7355] text-lg max-w-md mx-auto">
                  اختر دورك لدخول متجر زينة التجريبي وتجربة جميع الميزات
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {ROLE_OPTIONS.map((role) => (
                  <motion.div
                    key={role.value}
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer border-2 transition-all duration-200 ${
                        selectedRole === role.value
                          ? "border-[#C9A962] bg-[#FAF7F2]"
                          : "border-[#FAF7F2] hover:border-[#C9A962]/50"
                      }`}
                      onClick={() => handleSelectRole(role.value)}
                    >
                      <CardHeader className="flex flex-row items-center space-between pb-2">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${role.color} mb-2`}>
                          <role.icon className="h-5 w-5" />
                        </div>
                        {selectedRole === role.value && (
                          <CheckCircle className="h-5 w-5 text-[#C9A962]" />
                        )}
                      </CardHeader>
                      <CardContent className="flex flex-col items-start space-y-2 pt-0">
                        <CardTitle className="text-[#3D3021] font-bold text-lg">
                          {role.label}
                        </CardTitle>
                        <CardDescription className="text-[#666] text-sm leading-relaxed">
                          {role.description}
                        </CardDescription>
                        <div className="mt-4 w-full">
                          <Button
                            variant="outline"
                            className="w-full bg-[#3D3021] hover:bg-[#4A3D2E] text-white py-4 rounded-xl font-semibold transition-all"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ArrowRight className="mr-2 h-4 w-4" />
                            )}
                            دخول باسم {role.label}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <p className="text-xs text-[#999] uppercase tracking-wider">
                  وضع تجريبي — جميع البيانات تجريبية ويمكن حذفها في أي وقت
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
