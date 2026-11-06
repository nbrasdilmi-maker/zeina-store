const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  }
}

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const MARKER_KEY = "facebook_products_seed_v1";
const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, "facebook-products.json"), "utf8"),
);

(async () => {
  const marker = await db.setting.findUnique({ where: { key: MARKER_KEY } });
  if (marker) {
    console.log("FB_SEED_SKIPPED marker exists");
    return;
  }

  const categories = await db.category.findMany({
    where: { demoSessionId: null },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let created = 0;
  let skipped = 0;

  for (const item of products) {
    const existing = await db.product.findFirst({
      where: { sku: item.sku, demoSessionId: null },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await db.product.create({
      data: {
        name: item.name,
        nameAr: item.nameAr,
        description: item.desc,
        descriptionAr:
          `${item.descAr}\n\n` +
          "منشور أصلي من صفحة زينة للعطور والتجميل — صنعاء، باب السلام.\n" +
          "للطلب والاستفسار: +967 780 655 615",
        price: item.price,
        originalPrice: item.originalPrice ?? null,
        images: JSON.stringify([item.image]),
        mainImage: item.image,
        stock: 20,
        sku: item.sku,
        isActive: true,
        isFeatured: Boolean(item.featured),
        inStock: true,
        estimatedDays: 2,
        videoUrl: item.video,
        featuresAr: item.features.join("\n"),
        categoryId: categoryBySlug.get(item.cat) || null,
        demoSessionId: null,
      },
    });
    created += 1;
  }

  await db.setting.create({
    data: {
      key: MARKER_KEY,
      value: JSON.stringify({
        created,
        skipped,
        seededAt: new Date().toISOString(),
      }),
    },
  });

  console.log(`FB_SEED_DONE created=${created} skipped=${skipped}`);
})()
  .catch((error) => {
    console.error("FB_SEED_ERROR", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
