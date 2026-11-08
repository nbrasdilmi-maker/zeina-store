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

const groups = JSON.parse(
  fs.readFileSync(path.join(__dirname, "niceone-subcategories.json"), "utf8"),
);

// Move existing products from the parent category into the matching
// subcategory. Rules are scoped to the parent category, so re-running the
// seed never moves a product twice.
const PRODUCT_RULES = [
  {
    parent: "makeup",
    child: "makeup-sets",
    skus: ["FB-3", "FB-58", "FB-62", "FB-109", "FB-139"],
  },
  {
    parent: "makeup",
    child: "makeup-face",
    names: ["كريم أساس"],
  },
  {
    parent: "makeup",
    child: "makeup-eyes",
    names: ["ظلال"],
  },
  {
    parent: "makeup",
    child: "makeup-lips",
    names: ["روج", "جلوس"],
  },
  {
    parent: "perfumes",
    child: "perfumes-women",
    skus: ["FB-5", "FB-17"],
    names: ["شانيل", "ديور", "لانكوم", "توم فورد"],
  },
  {
    parent: "perfumes",
    child: "perfumes-men",
    skus: ["FB-19", "FB-67", "FB-88", "FB-89"],
  },
  {
    parent: "perfumes",
    child: "perfumes-sets",
    skus: ["FB-7", "FB-8", "FB-60", "FB-66", "FB-122", "FB-131"],
  },
  {
    parent: "perfumes",
    child: "perfumes-oud",
    skus: ["FB-65"],
    names: ["العز", "دهن عود"],
  },
  {
    parent: "haircare",
    child: "haircare-protein",
    skus: ["FB-130"],
    names: ["بروتين"],
  },
  {
    parent: "haircare",
    child: "haircare-oils",
    names: ["أولابليكس"],
  },
  {
    parent: "skincare",
    child: "skincare-serums",
    names: ["سيروم"],
  },
  {
    parent: "skincare",
    child: "skincare-moisturizers",
    names: ["لا مير"],
  },
  {
    parent: "bags",
    child: "bags-handbags",
    names: ["حقيبة"],
  },
  {
    parent: "accessories",
    child: "accessories-watches",
    names: ["ساعة"],
  },
  {
    parent: "accessories",
    child: "accessories-jewelry",
    names: ["سوار", "قلادة"],
  },
];

(async () => {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const group of groups) {
    const parent = await db.category.findFirst({
      where: { demoSessionId: null, slug: group.parent },
      select: { id: true, nameAr: true },
    });

    if (!parent) {
      console.warn(`SUBCATEGORY_PARENT_MISSING ${group.parent}`);
      continue;
    }

    for (const child of group.children) {
      const existing = await db.category.findFirst({
        where: {
          demoSessionId: null,
          OR: [{ slug: child.slug }, { parentId: parent.id, nameAr: child.nameAr }],
        },
        select: { id: true, parentId: true },
      });

      if (!existing) {
        await db.category.create({
          data: {
            name: child.name,
            nameAr: child.nameAr,
            slug: child.slug,
            parentId: parent.id,
            demoSessionId: null,
          },
        });
        created += 1;
        continue;
      }

      if (existing.parentId !== parent.id) {
        await db.category.update({
          where: { id: existing.id },
          data: { parentId: parent.id },
        });
        updated += 1;
      } else {
        skipped += 1;
      }
    }
  }

  let movedProducts = 0;
  for (const rule of PRODUCT_RULES) {
    const parent = await db.category.findFirst({
      where: { demoSessionId: null, slug: rule.parent },
      select: { id: true },
    });
    const child = await db.category.findFirst({
      where: { demoSessionId: null, slug: rule.child },
      select: { id: true },
    });

    if (!parent || !child) {
      console.warn(`SUBCATEGORY_RULE_SKIPPED ${rule.parent} -> ${rule.child}`);
      continue;
    }

    const filters = [];
    if (rule.skus && rule.skus.length > 0) {
      filters.push({ sku: { in: rule.skus } });
    }
    for (const name of rule.names || []) {
      filters.push({ nameAr: { contains: name } });
    }
    if (filters.length === 0) continue;

    // SKU rules are authoritative: search the parent and all of its current
    // children so an earlier incorrect assignment is repaired on the next run.
    let categoryScope = parent.id;
    if (rule.skus && rule.skus.length > 0) {
      const siblings = await db.category.findMany({
        where: { parentId: parent.id },
        select: { id: true },
      });
      categoryScope = {
        in: [parent.id, ...siblings.map((item) => item.id)],
      };
    }

    const result = await db.product.updateMany({
      where: {
        demoSessionId: null,
        categoryId: categoryScope,
        OR: filters,
      },
      data: { categoryId: child.id },
    });
    movedProducts += result.count;
  }

  console.log(
    `NICEONE_SUBCATEGORIES_DONE created=${created} updated=${updated} skipped=${skipped} moved_products=${movedProducts}`,
  );
})()
  .catch((error) => {
    console.error("NICEONE_SUBCATEGORIES_ERROR", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
