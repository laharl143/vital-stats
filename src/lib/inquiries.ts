// Inquiry.productId is a soft reference (no Prisma @relation) — this resolves
// it to a display name without requiring a schema migration.

interface InquiryWithProductId {
  productId: string | null;
}

interface ProductNameLookup {
  id: string;
  name: string;
}

export function attachProductNames<T extends InquiryWithProductId>(
  inquiries: T[],
  products: ProductNameLookup[]
): (T & { productName: string | null })[] {
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return inquiries.map((inquiry) => ({
    ...inquiry,
    productName: inquiry.productId ? nameById.get(inquiry.productId) ?? null : null,
  }));
}
