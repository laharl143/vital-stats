// ============================================================
// VitalStats — Prisma Seed
// Run: npx prisma db seed
// ============================================================

import { PrismaClient, Category, DeliveryMethod } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding VitalStats database...");

  // ── Weight Management ──────────────────────────────────────
  await prisma.product.upsert({
    where: { slug: "tirzepatide" },
    update: {},
    create: {
      slug: "tirzepatide",
      name: "Tirzepatide",
      tagline: "Once-a-week injection for weight loss and blood sugar control",
      description:
        "Tirzepatide is a once-a-week injection that helps people lose weight and control blood sugar. It works with your body through a next-generation dual-receptor mechanism.",
      howItWorks:
        "Tirzepatide mimics both GLP-1 and GIP receptors. GLP-1 controls hunger. GIP improves how your body handles nutrients. Tirzepatide enhances both systems at the same time, which is why it's considered a next-generation metabolic therapy.",
      howAdministered:
        "Once-weekly subcutaneous injection. Administered by a licensed healthcare professional under our medically supervised program.",
      warnings:
        "Our program is medically supervised and built for your long-term success. Our clinical team actively monitors your progress, adjusts your personalized plan, and prioritizes your safety at every stage.",
      category: Category.WEIGHT_MANAGEMENT,
      deliveryMethod: DeliveryMethod.INJECTION,
      requiresPrescription: true,
      isClinicallyGuided: true,
      sortOrder: 1,
      benefits: {
        create: [
          { benefit: "Make you feel full faster", sortOrder: 1 },
          { benefit: "Reduce hunger and cravings", sortOrder: 2 },
          { benefit: "Help your body manage sugar better", sortOrder: 3 },
          { benefit: "Support steady weight loss", sortOrder: 4 },
        ],
      },
    },
  });

  // ── Recovery & Anti-Aging — NAD+ ──────────────────────────
  await prisma.product.upsert({
    where: { slug: "nad-plus" },
    update: {},
    create: {
      slug: "nad-plus",
      name: "NAD+",
      tagline: "Cellular energy and anti-aging therapy",
      description:
        "Nicotinamide adenine dinucleotide (NAD+) is a natural substance found in every cell of your body. NAD+ levels naturally decrease as we age, which may affect energy, focus, and recovery.",
      howItWorks:
        "NAD+ helps turn food into energy, supports brain function, plays a key role in cell repair, and helps fight signs of aging at the cellular level.",
      howAdministered:
        "Injected into body fat — usually done in the abdomen or thigh. NAD+ treatments should always be supervised by a licensed healthcare professional to ensure safety and correct dosing.",
      warnings:
        "NAD+ treatments should always be supervised by a licensed healthcare professional to make sure it's safe and the dose is right for you.",
      category: Category.RECOVERY_ANTI_AGING,
      deliveryMethod: DeliveryMethod.INJECTION,
      requiresPrescription: false,
      isClinicallyGuided: true,
      sortOrder: 2,
      benefits: {
        create: [
          { benefit: "Boost energy levels", sortOrder: 1 },
          { benefit: "Improve mental clarity", sortOrder: 2 },
          { benefit: "Support recovery & wellness", sortOrder: 3 },
          { benefit: "Promote healthy aging", sortOrder: 4 },
        ],
      },
    },
  });

  // ── Recovery & Anti-Aging — GHK-Cu ────────────────────────
  await prisma.product.upsert({
    where: { slug: "ghk-cu" },
    update: {},
    create: {
      slug: "ghk-cu",
      name: "GHK-Cu",
      tagline: "Copper peptide for skin repair and regeneration",
      description:
        "GHK-Cu is a naturally occurring copper peptide found in the body that supports repair and regeneration. Particularly beneficial after weight loss for skin firming and stretch mark improvement.",
      howItWorks:
        "GHK-Cu stimulates collagen and elastin production, supports skin healing and tissue repair, improves firmness and elasticity, helps reduce the appearance of fine lines, and may support hair growth.",
      howAdministered:
        "Injected into body fat (abdomen or thigh), or applied via microneedling during skin procedures. Always supervised by a licensed healthcare professional.",
      warnings:
        "GHK-Cu treatments should always be supervised by a licensed healthcare professional to make sure it's safe and the dose is right for you.",
      category: Category.RECOVERY_ANTI_AGING,
      deliveryMethod: DeliveryMethod.INJECTION,
      requiresPrescription: false,
      isClinicallyGuided: true,
      sortOrder: 3,
      benefits: {
        create: [
          { benefit: "Stimulates collagen & elastin production", sortOrder: 1 },
          { benefit: "Supports skin healing & tissue repair", sortOrder: 2 },
          { benefit: "Improves firmness & elasticity", sortOrder: 3 },
          { benefit: "Reduces appearance of fine lines", sortOrder: 4 },
          { benefit: "May support hair growth", sortOrder: 5 },
        ],
      },
    },
  });

  // ── Skin Care — Luméla Soap ────────────────────────────────
  await prisma.product.upsert({
    where: { slug: "lumela-soap" },
    update: {},
    create: {
      slug: "lumela-soap",
      name: "Luméla Soap",
      tagline: "Daily brightening cleanser with Kojic Acid & vitamins",
      description:
        "Luméla Whitening Soap with Kojic Acid, Niacinamide & Vitamins A, C & E helps cleanse, brighten, and smooth skin while reducing dark spots. For a more even, radiant glow.",
      category: Category.SKIN_CARE,
      deliveryMethod: DeliveryMethod.TOPICAL,
      price: 150,
      isBestSeller: true,
      isFdaApproved: true,
      isClinicallyGuided: true,
      sortOrder: 4,
      benefits: {
        create: [
          { benefit: "Helps fade dark spots", sortOrder: 1 },
          { benefit: "Brightens and evens skin tone", sortOrder: 2 },
          { benefit: "Gentle enough for daily use", sortOrder: 3 },
        ],
      },
      ingredients: {
        create: [
          { name: "Kojic Acid", role: "Brightens skin and fades dark spots" },
          { name: "Niacinamide", role: "Evens tone and reduces redness" },
          { name: "Vitamin A", role: "Supports cell renewal" },
          { name: "Vitamin C", role: "Antioxidant brightening" },
          { name: "Vitamin E", role: "Moisturizes and protects" },
        ],
      },
    },
  });

  // ── Skin Care — Low pH Brightening Cleanser ────────────────
  await prisma.product.upsert({
    where: { slug: "low-ph-brightening-cleanser" },
    update: {},
    create: {
      slug: "low-ph-brightening-cleanser",
      name: "Low pH Brightening Cleanser",
      tagline: "Gentle clean, no dry feeling",
      description:
        "This low-pH cleanser removes dirt and oil without stripping your skin. With ceramides, collagen, hyaluronic acid, and peptides, it keeps skin hydrated, smooth, and protected. Perfect for sensitive skin. Use morning and night.",
      category: Category.SKIN_CARE,
      deliveryMethod: DeliveryMethod.TOPICAL,
      price: 720,
      isFdaApproved: true,
      isClinicallyGuided: true,
      sortOrder: 5,
      ingredients: {
        create: [
          { name: "Ceramides", role: "Restore and strengthen skin barrier" },
          { name: "Collagen", role: "Supports skin structure" },
          { name: "Hyaluronic Acid", role: "Deep hydration" },
          { name: "Peptides", role: "Skin repair and smoothing" },
        ],
      },
    },
  });

  // ── Skin Care — Brightening Sunscreen Serum Cream ─────────
  await prisma.product.upsert({
    where: { slug: "brightening-sunscreen-serum-cream" },
    update: {},
    create: {
      slug: "brightening-sunscreen-serum-cream",
      name: "Brightening Sunscreen Serum Cream",
      tagline: "SPF 50 PA++++ daily skin shield with hydration",
      description:
        "Formulated with 5x Ceramides, 3x Oligopeptides & Hyaluronic Acid, plus SPF 50 PA++++, this lightweight serum hydrates, strengthens your skin barrier, and protects against harmful UV rays. Smooth, firm, protected — every single day.",
      category: Category.SKIN_CARE,
      deliveryMethod: DeliveryMethod.TOPICAL,
      price: 895,
      isFdaApproved: true,
      isClinicallyGuided: true,
      sortOrder: 6,
      benefits: {
        create: [
          { benefit: "Broad-spectrum SPF 50 PA++++ sun protection", sortOrder: 1 },
          { benefit: "Strengthens skin barrier", sortOrder: 2 },
          { benefit: "Lightweight, non-greasy formula", sortOrder: 3 },
        ],
      },
      ingredients: {
        create: [
          { name: "5x Ceramides", role: "Multi-barrier strengthening" },
          { name: "3x Oligopeptides", role: "Skin repair and firmness" },
          { name: "Hyaluronic Acid", role: "Intense hydration" },
          { name: "SPF 50 PA++++", role: "UVA/UVB protection" },
        ],
      },
    },
  });

  // ── Skin Care — Luméla Lotion ──────────────────────────────
  await prisma.product.upsert({
    where: { slug: "lumela-lotion" },
    update: {},
    create: {
      slug: "lumela-lotion",
      name: "Luméla Lotion",
      tagline: "Brightening body lotion with AHA & vitamins",
      description:
        "Reveal a brighter, smoother glow with Luméla Whitening Lotion. With Niacinamide, AHA, and Vitamins A, C & E, it helps even skin tone, smooth texture, and keep skin hydrated, luminous, and healthy-looking. Perfect for daily use.",
      category: Category.SKIN_CARE,
      deliveryMethod: DeliveryMethod.TOPICAL,
      price: 290,
      isFdaApproved: true,
      isClinicallyGuided: true,
      sortOrder: 7,
      ingredients: {
        create: [
          { name: "Niacinamide", role: "Evens tone and reduces pores" },
          { name: "AHA", role: "Exfoliates and smooths texture" },
          { name: "Vitamin A, C & E", role: "Antioxidant brightening complex" },
        ],
      },
    },
  });

  // ── Skin Care — Soothing Toner ─────────────────────────────
  await prisma.product.upsert({
    where: { slug: "soothing-brightening-toner" },
    update: {},
    create: {
      slug: "soothing-brightening-toner",
      name: "Soothing and Brightening Toner",
      tagline: "Hydrate, calm, and strengthen your skin barrier",
      description:
        "This soothing toner with 5x Ceramides, 3x Oligopeptides, Calendula & Hyaluronic Acid helps strengthen your skin barrier, reduce redness, and boost hydration while prepping your skin for the next steps in your routine. Fragrance-free & alcohol-free.",
      category: Category.SKIN_CARE,
      deliveryMethod: DeliveryMethod.TOPICAL,
      price: 845,
      isFdaApproved: true,
      isClinicallyGuided: true,
      sortOrder: 8,
      benefits: {
        create: [
          { benefit: "Calms and balances skin", sortOrder: 1 },
          { benefit: "Locks in moisture", sortOrder: 2 },
          { benefit: "Supports healthy, glowing skin", sortOrder: 3 },
        ],
      },
    },
  });

  // ── Skin Care — Barrier Restore Serum ─────────────────────
  await prisma.product.upsert({
    where: { slug: "barrier-restore-brightening-serum" },
    update: {},
    create: {
      slug: "barrier-restore-brightening-serum",
      name: "Barrier Restore Brightening Serum",
      tagline: "SPF 50+ PA++++ serum that protects and brightens",
      description:
        "This lightweight sunscreen-serum with SPF50+ PA++++, 5x Ceramides, 3x Oligopeptides & Hyaluronic Acid protects against UVA/UVB rays while strengthening your skin barrier. Non-greasy, no white cast. Perfect as the last step of your morning routine — great under makeup.",
      category: Category.SKIN_CARE,
      deliveryMethod: DeliveryMethod.TOPICAL,
      price: 875,
      isFdaApproved: true,
      isClinicallyGuided: true,
      sortOrder: 9,
    },
  });

  // ── Skin Care — Barrier Moisture Gel ──────────────────────
  await prisma.product.upsert({
    where: { slug: "barrier-moisture-brightening-gel" },
    update: {},
    create: {
      slug: "barrier-moisture-brightening-gel",
      name: "Barrier Moisture Brightening Gel",
      tagline: "Lightweight hydration for a dewy, plumper glow",
      description:
        "This fast-absorbing gel moisturizer with 5x Ceramides, 3x Oligopeptides, Centella Asiatica, Hyaluronic Acid & Collagen deeply hydrates, strengthens the skin barrier, and smooths texture without a greasy feel. Skin looks plumper, brighter, and more elastic with continued use.",
      category: Category.SKIN_CARE,
      deliveryMethod: DeliveryMethod.TOPICAL,
      price: 850,
      isFdaApproved: true,
      isClinicallyGuided: true,
      sortOrder: 10,
      benefits: {
        create: [
          { benefit: "Barrier-strengthening formula", sortOrder: 1 },
          { benefit: "Long-lasting hydration", sortOrder: 2 },
          { benefit: "Smooth, radiant finish", sortOrder: 3 },
        ],
      },
    },
  });

  // ── Medical Consultation ───────────────────────────────────
  await prisma.product.upsert({
    where: { slug: "medical-consultation" },
    update: {},
    create: {
      slug: "medical-consultation",
      name: "Medical Consultation",
      tagline: "Personalized program guidance from our clinical team",
      description:
        "Our program is medically supervised and built for your long-term success. We aren't just a one-time service — our clinical team actively monitors your progress, adjusts your personalized plan, and prioritizes your safety at every stage.",
      category: Category.MEDICAL_CONSULTATION,
      deliveryMethod: DeliveryMethod.CONSULTATION,
      requiresPrescription: false,
      isClinicallyGuided: true,
      sortOrder: 11,
      benefits: {
        create: [
          { benefit: "Personalized wellness plan", sortOrder: 1 },
          { benefit: "Ongoing progress monitoring", sortOrder: 2 },
          { benefit: "Safety-first clinical oversight", sortOrder: 3 },
          { benefit: "Guidance on product availability", sortOrder: 4 },
        ],
      },
    },
  });

  console.log("✅ Seed complete — 11 products created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
