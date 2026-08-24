import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 20;

// Parses page/limit query params, rejecting non-numeric or non-positive
// values by falling back to the default rather than letting NaN reach
// Prisma's skip/take (VS-162 — this previously happened identically in
// three separate route handlers).
export function parsePaginationParams(searchParams: URLSearchParams) {
  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");

  const page = rawPage === null ? 1 : Number(rawPage);
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
  };
}

// Runs a findMany + count pair inside a transaction and builds the
// { total, page, limit, totalPages } meta shape shared by the admin list
// endpoints. Callers build their model-specific findMany/count queries
// with the given skip/take.
export async function paginate<T>(
  searchParams: URLSearchParams,
  build: (
    skip: number,
    take: number
  ) => { findMany: Prisma.PrismaPromise<T[]>; count: Prisma.PrismaPromise<number> }
) {
  const { page, limit } = parsePaginationParams(searchParams);
  const skip = (page - 1) * limit;
  const { findMany, count } = build(skip, limit);

  const [data, total] = await prisma.$transaction([findMany, count]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
