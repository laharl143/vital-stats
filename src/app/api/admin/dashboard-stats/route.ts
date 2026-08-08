import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

const FIXED_RANGES = [7, 14, 30, 60] as const;
type RangeParam = (typeof FIXED_RANGES)[number] | "all";
const MAX_ALL_TIME_DAYS = 366;

type ActivityType = "inquiry" | "consult" | "order";

interface ActivityItem {
  id: string;
  type: ActivityType;
  name: string;
  subtitle: string;
  status: string;
  createdAt: string;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildSeries(days: string[], createdAts: Date[]) {
  const counts = new Map(days.map((d) => [d, 0]));
  for (const date of createdAts) {
    const key = dayKey(date);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((d) => counts.get(d) ?? 0);
}

function parseRange(raw: string | null): RangeParam {
  if (raw === "all") return "all";
  const n = Number(raw);
  return (FIXED_RANGES as readonly number[]).includes(n) ? (n as (typeof FIXED_RANGES)[number]) : 14;
}

// GET /api/admin/dashboard-stats?range=7|14|30|60|all  (admin only)
// Aggregated dashboard data: current totals, week-over-week deltas, a daily
// series per activity type over the requested range, and a merged
// recent-activity feed — replaces the 7 separate fetches the dashboard
// previously made on load. Totals/deltas are independent of `range`; only
// the chart series window changes.
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const range = parseRange(searchParams.get("range"));
    const now = new Date();

    let seriesDays: number;
    if (range === "all") {
      const [earliestInquiry, earliestConsult, earliestOrder] = await Promise.all([
        prisma.inquiry.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.medicalHistory.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.order.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      ]);
      const earliest = [earliestInquiry, earliestConsult, earliestOrder]
        .map((r) => r?.createdAt)
        .filter((d): d is Date => d != null)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const daysSinceEarliest = earliest
        ? Math.ceil((now.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000)) + 1
        : 14;
      seriesDays = Math.min(Math.max(daysSinceEarliest, 1), MAX_ALL_TIME_DAYS);
    } else {
      seriesDays = range;
    }

    const seriesStart = new Date(now);
    seriesStart.setDate(seriesStart.getDate() - (seriesDays - 1));
    seriesStart.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      newInquiries,
      newConsultRequests,
      pendingOrders,
      totalOrders,
      inquiriesSince,
      consultsSince,
      ordersSince,
      recentInquiries,
      recentConsults,
      recentOrders,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.inquiry.count({ where: { status: "NEW" } }),
      prisma.medicalHistory.count({ where: { status: "NEW" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count(),
      prisma.inquiry.findMany({ where: { createdAt: { gte: seriesStart } }, select: { createdAt: true } }),
      prisma.medicalHistory.findMany({ where: { createdAt: { gte: seriesStart } }, select: { createdAt: true } }),
      prisma.order.findMany({ where: { createdAt: { gte: seriesStart } }, select: { createdAt: true } }),
      prisma.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.medicalHistory.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

    const days: string[] = [];
    for (let i = 0; i < seriesDays; i++) {
      const d = new Date(seriesStart);
      d.setDate(d.getDate() + i);
      days.push(dayKey(d));
    }

    const series = {
      days,
      inquiries: buildSeries(days, inquiriesSince.map((r) => r.createdAt)),
      consults: buildSeries(days, consultsSince.map((r) => r.createdAt)),
      orders: buildSeries(days, ordersSince.map((r) => r.createdAt)),
    };

    const deltas = {
      inquiriesThisWeek: inquiriesSince.filter((r) => r.createdAt >= oneWeekAgo).length,
      consultsThisWeek: consultsSince.filter((r) => r.createdAt >= oneWeekAgo).length,
      ordersThisWeek: ordersSince.filter((r) => r.createdAt >= oneWeekAgo).length,
    };

    const activity: ActivityItem[] = [
      ...recentInquiries.map((r) => ({
        id: r.id,
        type: "inquiry" as const,
        name: r.name,
        subtitle: r.message.slice(0, 60),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      ...recentConsults.map((r) => ({
        id: r.id,
        type: "consult" as const,
        name: r.fullName,
        subtitle: r.email || r.phone || "—",
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      ...recentOrders.map((r) => ({
        id: r.id,
        type: "order" as const,
        name: r.customerName,
        subtitle: r.totalAmount ? `₱${parseFloat(r.totalAmount.toString()).toLocaleString()}` : "Price on inquiry",
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    return NextResponse.json({
      data: {
        totals: { totalProducts, newInquiries, newConsultRequests, pendingOrders, totalOrders },
        deltas,
        series,
        recentActivity: activity,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/dashboard-stats]", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
