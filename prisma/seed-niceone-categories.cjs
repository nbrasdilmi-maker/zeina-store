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
const categories = JSON.parse(
  fs.readFileSync(path.join(__dirname, "niceone-categories.json"), "utf8"),
);

(async () => {
  let created = 0;
  let skipped = 0;

  for (const item of categories) {
    const existing = await db.category.findFirst({
      where: {
        demoSessionId: null,
        OR: [{ slug: item.slug }, { nameAr: item.nameAr }],
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await db.category.create({
      data: {
        name: item.name,
        nameAr: item.nameAr,
        slug: item.slug,
        image: item.image,
        demoSessionId: null,
      },
    });
    created += 1;
  }

  console.log(`NICEONE_CATEGORIES_DONE created=${created} skipped=${skipped}`);
})()
  .catch((error) => {
    console.error("NICEONE_CATEGORIES_ERROR", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
