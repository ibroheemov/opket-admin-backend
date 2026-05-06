import { Request, Response } from "express";
import dayjs from "dayjs";
import { OrderModel } from "../models/OrderModel";

function bad(res: Response, code: number, message: string) {
    return res.status(code).json({ ok: false, message });
}
function ok(res: Response, data: any) {
    return res.json({ ok: true, data });
}

/**
 * GET /admin/orders/stats
 * Query:
 *   serviceType  DELIVERY | DINE_IN  (required)
 *   tz           IANA timezone (default: Asia/Tashkent)
 *
 * Response:
 *   { today:{count,revenue}, week:{count,revenue}, month:{count,revenue},
 *     active:{count}, total:{count,revenue}, avgOrderValueToday }
 */
export async function getOrderStats(req: Request, res: Response) {
    try {
        const serviceType = String(req.query.serviceType || "").toUpperCase();
        if (serviceType !== "DELIVERY" && serviceType !== "DINE_IN") {
            return bad(res, 400, "serviceType must be DELIVERY or DINE_IN");
        }

        // Day boundaries computed in restaurant tz; orderDate field is a YYYY-MM-DD string,
        // so we can compare lexicographically (safe for ISO dates).
        const now = dayjs();
        const today = now.format("YYYY-MM-DD");
        // Monday-start week
        const dow = now.day(); // 0=Sun..6=Sat
        const daysFromMonday = (dow + 6) % 7;
        const weekStart = now.subtract(daysFromMonday, "day").format("YYYY-MM-DD");
        const monthStart = now.format("YYYY-MM-01");

        const [agg] = await OrderModel.aggregate([
            { $match: { serviceType } },
            {
                $facet: {
                    today: [
                        { $match: { orderDate: today } },
                        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
                    ],
                    week: [
                        { $match: { orderDate: { $gte: weekStart } } },
                        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
                    ],
                    month: [
                        { $match: { orderDate: { $gte: monthStart } } },
                        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
                    ],
                    active: [
                        { $match: { isActive: true } },
                        { $count: "count" },
                    ],
                    total: [
                        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$pricing.total" } } },
                    ],
                },
            },
        ]);

        const pick = (arr: any[]) => (arr && arr[0]) ? arr[0] : { count: 0, revenue: 0 };
        const todayBlock = pick(agg.today);
        const weekBlock = pick(agg.week);
        const monthBlock = pick(agg.month);
        const totalBlock = pick(agg.total);
        const activeCount = (agg.active && agg.active[0]?.count) || 0;
        const avgOrderValueToday = todayBlock.count > 0 ? Math.round(todayBlock.revenue / todayBlock.count) : 0;

        return ok(res, {
            serviceType,
            today: { count: todayBlock.count, revenue: todayBlock.revenue },
            week: { count: weekBlock.count, revenue: weekBlock.revenue },
            month: { count: monthBlock.count, revenue: monthBlock.revenue },
            active: { count: activeCount },
            total: { count: totalBlock.count, revenue: totalBlock.revenue },
            avgOrderValueToday,
        });
    } catch (err: any) {
        console.error("getOrderStats:", err);
        return bad(res, 500, err?.message ?? "Server error");
    }
}
