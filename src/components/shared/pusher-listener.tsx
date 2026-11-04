"use client";

import { useEffect } from "react";
import { pusherClient } from "@/lib/pusher";
import { useToast } from "@/hooks/use-toast";

export function PusherListener() {
    const { toast } = useToast();

    useEffect(() => {
        // In demo mode, Pusher is disabled.
        // Real-time updates are handled via polling in the UI components.
        if (!pusherClient) {
            return;
        }

        // الاشتراك في القناة العامة للمتجر
        const channel = pusherClient.subscribe("tarfah-public-channel");

        // الاستماع لأي حدث أو إشعار جديد
        channel.bind("new-notification", (data: { title: string; description: string }) => {
            toast({
                title: data.title,
                description: data.description,
            });
        });

        // إغلاق الاتصال عند خروج المستخدم من المتجر لتوفير الموارد
        return () => {
            pusherClient.unsubscribe("tarfah-public-channel");
        };
    }, [toast]);

    return null; // هذا المكون لا يظهر في الشاشة، يعمل في الخلفية فقط
}
