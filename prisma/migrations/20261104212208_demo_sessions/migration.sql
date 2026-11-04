-- AlterTable
ALTER TABLE "advertisements" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "hero_banners" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "demoSessionId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "demoSessionId" TEXT;

-- CreateTable
CREATE TABLE "demo_sessions" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_banners" ADD CONSTRAINT "hero_banners_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_demoSessionId_fkey" FOREIGN KEY ("demoSessionId") REFERENCES "demo_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
