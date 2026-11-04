// Seed script to create admin user and sample data
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database for Tarifa Yemen...");

  // 1. تشفير كلمة المرور بنظام bcrypt المتوافق مع لوحة التحكم
  const plainPassword = "admin123";
  const adminPassword = await bcrypt.hash(plainPassword, 10);

  // 2. تحديث حساب المدير بكلمة السر الجديدة
  const admin = await prisma.user.upsert({
    where: { email: "admin@tarifa.com" },
    update: {
      password: adminPassword,
    },
    create: {
      email: "admin@tarifa.com",
      name: "جلال - الإدارة",
      password: adminPassword,
      phone: "777123456",
      address: "صنعاء، الجمهورية اليمنية",
      role: "ADMIN",
      isVerified: true,
      isActive: true,
    },
  });

  console.log("✅ Admin user created/updated:", admin.email);
  console.log("🔑 Password is set to: admin123");

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "perfumes" },
      update: {},
      create: {
        name: "Perfumes",
        nameAr: "عطور",
        slug: "perfumes",
        image:
          "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "makeup" },
      update: {},
      create: {
        name: "Makeup",
        nameAr: "مكياج",
        slug: "makeup",
        image:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "accessories" },
      update: {},
      create: {
        name: "Accessories",
        nameAr: "أكسسوارات",
        slug: "accessories",
        image:
          "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "skincare" },
      update: {},
      create: {
        name: "Skincare",
        nameAr: "عناية بالبشرة",
        slug: "skincare",
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "haircare" },
      update: {},
      create: {
        name: "Hair Care",
        nameAr: "العناية بالشعر",
        slug: "haircare",
        image:
          "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "bags" },
      update: {},
      create: {
        name: "Bags",
        nameAr: "حقائب",
        slug: "bags",
        image:
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
      },
    }),
  ]);
  console.log("✅ Categories created:", categories.length);

  // Create sample products with Yemeni Riyal prices
  const products = [
    // عطور - Perfumes
    {
      name: "Chanel No. 5 Eau de Parfum",
      nameAr: "شانيل رقم 5 أو دي بارفان",
      description: "العطر الأيقوني الأكثر مبيعاً في العالم - 100 مل",
      descriptionAr:
        "العطر الأيقوني الأكثر مبيعاً في العالم، رائحة أنثوية كلاسيكية فاخرة - 100 مل",
      price: 45000,
      originalPrice: 55000,
      mainImage:
        "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400",
      ]),
      stock: 15,
      categoryId: categories[0].id,
      isFeatured: true,
    },
    {
      name: "Dior J'adore Eau de Parfum",
      nameAr: "ديور جادور أو دي بارفان",
      description: "عطر نسائي فاخر برائحة الياسمين والورد - 100 مل",
      descriptionAr:
        "عطر نسائي فاخر من دار كريستيان ديور، برائحة الياسمين والورد والفريزيا - 100 مل",
      price: 38000,
      originalPrice: 45000,
      mainImage:
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
      ]),
      stock: 20,
      categoryId: categories[0].id,
      isFeatured: true,
    },
    {
      name: "Lancôme La Vie Est Belle",
      nameAr: "لانكوم لا في إيست بيل",
      description: "عطر الحياة جميلة - 75 مل",
      descriptionAr:
        "عطر نسائي ساحر برائحة الإيريس والبرفوم والفانيليا - 75 مل",
      price: 32000,
      originalPrice: 40000,
      mainImage:
        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400",
      ]),
      stock: 25,
      categoryId: categories[0].id,
      isFeatured: true,
    },
    {
      name: "Tom Ford Black Orchid",
      nameAr: "توم فورد بلاك أوركيد",
      description: "عطر فاخر للمناسبات الخاصة - 100 مل",
      descriptionAr: "عطر فاخر غامض وساحر للمناسبات الخاصة والسهرات - 100 مل",
      price: 65000,
      originalPrice: 75000,
      mainImage:
        "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400",
      ]),
      stock: 10,
      categoryId: categories[0].id,
      isFeatured: true,
    },
    // مكياج - Makeup
    {
      name: "MAC Studio Fix Fluid Foundation",
      nameAr: "كريم أساس ماك ستوديو فيكس",
      description: "كريم أساس بغطاء تام ومات - 30 مل",
      descriptionAr:
        "كريم أساس احترافي بغطاء تام ولمعة مطفية يدوم 24 ساعة - 30 مل",
      price: 8500,
      originalPrice: 10000,
      mainImage:
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
      ]),
      stock: 50,
      categoryId: categories[1].id,
      isFeatured: true,
    },
    {
      name: "Urban Decay Naked Eyeshadow Palette",
      nameAr: "لوحة ظلال عيون أربان ديكاي نيكي",
      description: "لوحة ظلال عيون بـ 12 لون - باليت",
      descriptionAr:
        "لوكة ظلال عيون احترافية بـ 12 لون متنوع للنهار والليل - باليت",
      price: 15000,
      originalPrice: 18000,
      mainImage:
        "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400",
      ]),
      stock: 30,
      categoryId: categories[1].id,
      isFeatured: true,
    },
    {
      name: "Charlotte Tilbury Pillow Talk Lipstick",
      nameAr: "روج شارلوت تيلبوري بيلو توك",
      description: "روج مات باللون الطبيعي المثالي",
      descriptionAr:
        "روج مات باللون الطبيعي المثالي الذي يناسب جميع ألوان البشرة",
      price: 6500,
      originalPrice: 7500,
      mainImage:
        "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400",
      ]),
      stock: 100,
      categoryId: categories[1].id,
      isFeatured: true,
    },
    {
      name: "Fenty Beauty Gloss Bomb",
      nameAr: "جلوس بوم فينتي بيوتي",
      description: "جلوس شفاه لامع ورطب - عدة ألوان",
      descriptionAr:
        "جلوس شفاه لامع ورطب بتركيبة غنية بفيتامين E - عدة ألوان متاحة",
      price: 4500,
      originalPrice: 5500,
      mainImage:
        "https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400",
      ]),
      stock: 80,
      categoryId: categories[1].id,
      isFeatured: true,
    },
    // أكسسوارات - Accessories
    {
      name: "Akoya Pearl Necklace Set",
      nameAr: "طقم قلادة لؤلؤ أكويا",
      description: "قلادة وأقراط من لؤلؤ أكويا الطبيعي",
      descriptionAr:
        "طقم فاخر يتكون من قلادة وأقراط من لؤلؤ أكويا الطبيعي بتصميم كلاسيكي أنيق",
      price: 85000,
      originalPrice: 100000,
      mainImage:
        "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
      ]),
      stock: 8,
      categoryId: categories[2].id,
      isFeatured: true,
    },
    {
      name: "Swarovski Crystal Bracelet",
      nameAr: "سوار كريستال سواروفسكي",
      description: "سوار فاخر مرصع بالكريستال",
      descriptionAr:
        "سوار فاخر من سواروفسكي مرصع بالكريستال اللامع بتصميم عصري",
      price: 25000,
      originalPrice: 30000,
      mainImage:
        "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400",
      ]),
      stock: 20,
      categoryId: categories[2].id,
      isFeatured: true,
    },
    {
      name: "Michael Kors Watch Rose Gold",
      nameAr: "ساعة مايكل كورز روز جولد",
      description: "ساعة نسائية بتصميم روز جولد",
      descriptionAr:
        "ساعة يد نسائية فاخرة من مايكل كورز بلون الذهب الوردي بتصميم عصري أنيق",
      price: 75000,
      originalPrice: 90000,
      mainImage:
        "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400",
      ]),
      stock: 12,
      categoryId: categories[2].id,
      isFeatured: true,
    },
    // عناية بالبشرة - Skincare
    {
      name: "La Mer Moisturizing Cream",
      nameAr: "كريم لا مير المرطب",
      description: "كريم مرطب فاخر - 60 مل",
      descriptionAr:
        "كريم مرطب فاخر غني بمعجون البحر الخالد لبشرة نضرة ومشرقة - 60 مل",
      price: 120000,
      originalPrice: 150000,
      mainImage:
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
      ]),
      stock: 10,
      categoryId: categories[3].id,
      isFeatured: true,
    },
    {
      name: "SK-II Facial Treatment Essence",
      nameAr: "سيروم سك-2 للعناية بالوجه",
      description: "سيروم عناية بالوجه - 230 مل",
      descriptionAr:
        "سيروم عناية ياباني فاخر غني بـ PITERA لبشرة صافية ومشرقة - 230 مل",
      price: 65000,
      originalPrice: 75000,
      mainImage:
        "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400",
      ]),
      stock: 15,
      categoryId: categories[3].id,
      isFeatured: true,
    },
    {
      name: "The Ordinary Niacinamide 10% + Zinc 1%",
      nameAr: "سيروم نياسينامايد ذي أورديناري",
      description: "سيروم لتقليل المسام والتصبغات - 30 مل",
      descriptionAr:
        "سيروم مركز لتقليل المسام والتصبغات وتحسين ملمس البشرة - 30 مل",
      price: 3500,
      originalPrice: 4500,
      mainImage:
        "https://images.unsplash.com/photo-1556228578-0d85b668e970?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1556228578-0d85b668e970?w=400",
      ]),
      stock: 100,
      categoryId: categories[3].id,
      isFeatured: true,
    },
    // العناية بالشعر - Hair Care
    {
      name: "Olaplex No. 3 Hair Perfector",
      nameAr: "أولابليكس رقم 3 للشعر",
      description: "علاج مكثف للشعر التالف - 100 مل",
      descriptionAr:
        "علاج مكثف لإصلاح الشعر التالب من الصبغات والحرارة - 100 مل",
      price: 12000,
      originalPrice: 15000,
      mainImage:
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
      ]),
      stock: 40,
      categoryId: categories[4].id,
      isFeatured: true,
    },
    // حقائب - Bags
    {
      name: "Michael Kors Crossbody Bag",
      nameAr: "حقيبة مايكل كورز كروس باجي",
      description: "حقيبة يد كروس باجي جلد طبيعي",
      descriptionAr:
        "حقيبة يد كروس باجي من الجلد الطبيعي بتصميم عصري - لون بني",
      price: 55000,
      originalPrice: 65000,
      mainImage:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
      ]),
      stock: 15,
      categoryId: categories[5].id,
      isFeatured: true,
    },
  ];

  for (const product of products) {
    // Check if product exists by name
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (!existing) {
      await prisma.product.create({
        data: {
          ...product,
          agentId: admin.id,
        },
      });
    }
  }
  console.log("✅ Products created:", products.length);

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Admin Login Credentials:");
  console.log("   Email: admin@tarifa.com");
  console.log("   Password: zdRoKhwJLVaaaLwJ3H/U");
  console.log("\n📍 Location: الجمهورية اليمنية");
  console.log("💰 Currency: الريال اليمني (ر.ي)");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
