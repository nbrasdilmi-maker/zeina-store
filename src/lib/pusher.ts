/**
 * Pusher Configuration - Demo Mode
 * In Demo mode, Pusher is disabled. Real-time updates use polling instead.
 * The original Pusher code is preserved below for future production use.
 */

// DISABLED IN DEMO MODE - Pusher is not available on Vercel Serverless
// To re-enable in production, uncomment the code below and add Pusher credentials to .env

/*
import PusherServer from "pusher";
import PusherClient from "pusher-js";

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
  useTLS: true,
});

export const pusherClient =
  typeof window !== "undefined"
    ? new PusherClient(
        process.env.NEXT_PUBLIC_PUSHER_KEY || "",
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
          forceTLS: true,
        },
      )
    : null;
*/

// Demo mode: return null for both server and client
export const pusherServer = null;
export const pusherClient = null;

export { pusherServer, pusherClient };
