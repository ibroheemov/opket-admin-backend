import { Request, Response } from "express";
import { Types } from "mongoose";
import { RestaurantModel } from "../models/Restaurant";
import { MenuCategoryModel } from "../models/MenuCategory";
import { MenuItemModel } from "../models/MenuItem";
import { ItemOptionGroupModel } from "../models/ItemOptionGroup";
import { ItemOptionModel } from "../models/ItemOption";
import { OrderModel } from "../models/OrderModel";
import { ReviewModel } from "../models/Review";
import { getNextOrderNumber } from "../utils/getNextOrderNumber";
import { emitToRestaurant } from "../gateway/socket";

function ok(res: Response, data: any) { return res.json({ ok: true, data }); }
function bad(res: Response, code: number, message: string) {
    return res.status(code).json({ ok: false, message });
}
const isId = (s: string) => Types.ObjectId.isValid(s);

// ---------- GET /public/r/:slug ----------
export async function getPublicRestaurant(req: Request, res: Response) {
    try {
        const { slug } = req.params;
        const restaurant = await RestaurantModel.findOne({ slug, status: "ACTIVE" })
            .select("name slug description phone address logo_url banner_url gallery_urls cuisine_types tags price_tier hours_json timezone is_open accepting_orders rating_avg rating_count currency")
            .lean();
        if (!restaurant) return bad(res, 404, "Restoran topilmadi");

        const restaurantId = (restaurant as any)._id;

        const [categories, items] = await Promise.all([
            MenuCategoryModel.find({ restaurantId })
                .sort({ sort_order: 1, createdAt: 1 })
                .select("_id name sort_order")
                .lean(),
            MenuItemModel.find({ restaurantId, is_available: true })
                .sort({ sort_order: 1, createdAt: 1 })
                .select("_id categoryId name description price image_url sort_order")
                .lean(),
        ]);

        const itemIds = items.map((i: any) => i._id);
        const groups = await ItemOptionGroupModel.find({ itemId: { $in: itemIds } })
            .lean();
        const groupIds = groups.map((g: any) => g._id);
        const options = await ItemOptionModel.find({ groupId: { $in: groupIds }, is_available: true })
            .lean();

        const optionsByGroup = new Map<string, any[]>();
        for (const o of options) {
            const k = String((o as any).groupId);
            if (!optionsByGroup.has(k)) optionsByGroup.set(k, []);
            optionsByGroup.get(k)!.push(o);
        }

        const groupsByItem = new Map<string, any[]>();
        for (const g of groups) {
            const k = String((g as any).itemId);
            if (!groupsByItem.has(k)) groupsByItem.set(k, []);
            groupsByItem.get(k)!.push({
                _id: (g as any)._id,
                name: (g as any).name,
                min_select: (g as any).min_select,
                max_select: (g as any).max_select,
                is_required: (g as any).min_select >= 1,
                options: optionsByGroup.get(String((g as any)._id)) || [],
            });
        }

        const itemsWithGroups = items.map((it: any) => ({
            ...it,
            option_groups: groupsByItem.get(String(it._id)) || [],
        }));

        return ok(res, { restaurant, categories, items: itemsWithGroups });
    } catch (err: any) {
        console.error("getPublicRestaurant:", err);
        return bad(res, 500, err?.message ?? "Server error");
    }
}

// ---------- POST /public/orders ----------
type IncomingOption = { groupId: string; optionIds: string[] };
type IncomingItem = {
    menuItemId: string;
    quantity: number;
    selectedOptions?: IncomingOption[];
    notes?: string;
};

export async function createPublicOrder(req: Request, res: Response) {
    try {
        const { slug, tableNumber, items, notes } = req.body as {
            slug: string;
            tableNumber: number;
            items: IncomingItem[];
            notes?: string;
        };

        if (!slug) return bad(res, 400, "slug talab qilinadi");
        if (!Array.isArray(items) || items.length === 0) return bad(res, 400, "Buyurtma bo'sh");
        if (!Number.isInteger(tableNumber) || tableNumber < 1) {
            return bad(res, 400, "Stol raqami noto'g'ri");
        }

        const restaurant = await RestaurantModel.findOne({ slug, status: "ACTIVE" }).lean();
        if (!restaurant) return bad(res, 404, "Restoran topilmadi");
        const restaurantId = (restaurant as any)._id as Types.ObjectId;
        const ownerUserId = (restaurant as any).ownerUserId;

        if (!(restaurant as any).accepting_orders) {
            return bad(res, 409, "Restoran hozir buyurtma qabul qilmayapti");
        }

        // Load all referenced menu items in one query
        const menuItemIds = items.map((i) => i.menuItemId).filter(isId).map((s) => new Types.ObjectId(s));
        if (menuItemIds.length !== items.length) return bad(res, 400, "Yaroqsiz mahsulot identifikatori");

        const menuItems = await MenuItemModel.find({
            _id: { $in: menuItemIds },
            restaurantId,
            is_available: true,
        }).lean();
        const menuById = new Map<string, any>(menuItems.map((m: any) => [String(m._id), m]));

        if (menuById.size !== menuItemIds.length) return bad(res, 400, "Ba'zi mahsulotlar mavjud emas yoki sotuvda emas");

        // Load all option groups + options for these items in one go
        const groups = await ItemOptionGroupModel.find({ itemId: { $in: menuItemIds } }).lean();
        const groupById = new Map<string, any>(groups.map((g: any) => [String(g._id), g]));
        const groupIds = groups.map((g: any) => g._id);
        const options = await ItemOptionModel.find({ groupId: { $in: groupIds } }).lean();
        const optionById = new Map<string, any>(options.map((o: any) => [String(o._id), o]));

        const orderItems: any[] = [];
        let itemsSubtotal = 0;

        for (const inp of items) {
            const mi = menuById.get(inp.menuItemId);
            if (!mi) return bad(res, 400, `Mahsulot topilmadi: ${inp.menuItemId}`);
            const qty = Number(inp.quantity);
            if (!Number.isInteger(qty) || qty < 1 || qty > 999) return bad(res, 400, "Noto'g'ri miqdor");

            let unitPrice = Number(mi.price) || 0;
            const selected: any[] = [];
            const optionNames: string[] = [];

            const sel = inp.selectedOptions || [];
            for (const sg of sel) {
                const grp = groupById.get(sg.groupId);
                if (!grp || String(grp.itemId) !== inp.menuItemId) {
                    return bad(res, 400, "Opsiya guruhi mahsulotga tegishli emas");
                }
                const oids = (sg.optionIds || []).filter((x) => typeof x === "string");
                if (oids.length < (grp.min_select || 0)) {
                    return bad(res, 400, `"${grp.name}" uchun kamida ${grp.min_select} ta tanlang`);
                }
                if (oids.length > (grp.max_select || 1)) {
                    return bad(res, 400, `"${grp.name}" uchun ko'pi bilan ${grp.max_select} ta tanlang`);
                }
                for (const oid of oids) {
                    const opt = optionById.get(oid);
                    if (!opt || String(opt.groupId) !== sg.groupId) {
                        return bad(res, 400, "Yaroqsiz opsiya");
                    }
                    unitPrice += Number(opt.price_delta) || 0;
                    optionNames.push(opt.name);
                    selected.push({
                        groupId: grp._id,
                        groupName: grp.name,
                        optionId: opt._id,
                        optionName: opt.name,
                        price_delta: Number(opt.price_delta) || 0,
                    });
                }
            }

            // Required group enforcement
            const itemGroups = groups.filter((g: any) => String(g.itemId) === inp.menuItemId);
            for (const ig of itemGroups) {
                if ((ig.min_select || 0) >= 1) {
                    const has = sel.find((s: any) => s.groupId === String(ig._id));
                    if (!has || (has.optionIds || []).length === 0) {
                        return bad(res, 400, `"${ig.name}" majburiy`);
                    }
                }
            }

            const displayName = optionNames.length > 0
                ? `${mi.name} (${optionNames.join(", ")})`
                : mi.name;

            const subtotal = unitPrice * qty;
            itemsSubtotal += subtotal;

            orderItems.push({
                menuItemId: mi._id,
                name: displayName,
                price: unitPrice,
                quantity: qty,
                subtotal,
                selectedOptions: selected,
                notes: typeof inp.notes === "string" ? inp.notes.slice(0, 300) : null,
            });
        }

        const { orderNumber, orderDate } = await getNextOrderNumber(String(restaurantId));

        const created = await OrderModel.create({
            restaurantId,
            consumerId: null,
            consumerPhone: null,
            serviceType: "DINE_IN",
            tableNumber,
            items: orderItems,
            pricing: {
                itemsSubtotal,
                deliveryFee: 0,
                serviceFee: 0,
                tax: 0,
                discount: 0,
                total: itemsSubtotal,
            },
            orderNumber,
            orderDate,
            status: "PLACED",
            statusHistory: [{ status: "PLACED", at: new Date(), note: notes || undefined }],
        });

        // Emit Socket.io to restaurant owner — same channel + key the driver app already listens on.
        try {
            const populated = await OrderModel.findById(created._id)
                .populate({ path: "restaurantId", select: "name phone slug" })
                .lean();
            await emitToRestaurant(String(ownerUserId), "food_order", populated);
            await emitToRestaurant(`${String(ownerUserId)}-bg`, "food_order", populated);
        } catch (e) {
            console.warn("socket emit failed:", e);
        }

        const out = await OrderModel.findById(created._id)
            .populate({ path: "restaurantId", select: "name phone slug logo_url address" })
            .lean();

        return ok(res, out);
    } catch (err: any) {
        console.error("createPublicOrder:", err);
        return bad(res, 500, err?.message ?? "Server error");
    }
}

// ---------- GET /public/orders/:orderId ----------
export async function getPublicOrder(req: Request, res: Response) {
    try {
        const { orderId } = req.params;
        if (!isId(orderId)) return bad(res, 400, "Noto'g'ri buyurtma identifikatori");
        const order = await OrderModel.findById(orderId)
            .populate({ path: "restaurantId", select: "name phone slug logo_url address" })
            .lean();
        if (!order) return bad(res, 404, "Buyurtma topilmadi");
        return ok(res, order);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

// ---------- POST /public/reviews/:orderId ----------
export async function createPublicReview(req: Request, res: Response) {
    try {
        const { orderId } = req.params;
        const { rating, comment } = req.body as { rating: number; comment?: string };

        if (!isId(orderId)) return bad(res, 400, "Noto'g'ri buyurtma identifikatori");
        const r = Number(rating);
        if (!Number.isInteger(r) || r < 1 || r > 5) return bad(res, 400, "Reyting 1 dan 5 gacha");

        const order = await OrderModel.findById(orderId).lean();
        if (!order) return bad(res, 404, "Buyurtma topilmadi");
        if ((order as any).serviceType !== "DINE_IN") return bad(res, 400, "Faqat ichki buyurtmalar uchun");

        const reviewable = new Set(["READY_FOR_PICKUP", "DELIVERED"]);
        if (!reviewable.has((order as any).status)) {
            return bad(res, 409, "Buyurtma hali tayyor emas");
        }

        const existing = await ReviewModel.findOne({ orderId }).lean();
        if (existing) return bad(res, 409, "Bu buyurtma uchun fikr qoldirilgan");

        const created = await ReviewModel.create({
            orderId,
            restaurantId: (order as any).restaurantId,
            rating: r,
            comment: comment ? String(comment).slice(0, 1000) : null,
        });

        // best-effort aggregate
        try {
            const agg = await ReviewModel.aggregate([
                { $match: { restaurantId: (order as any).restaurantId } },
                { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
            ]);
            if (agg[0]) {
                await RestaurantModel.findByIdAndUpdate((order as any).restaurantId, {
                    rating_avg: Math.round((agg[0].avg || 0) * 10) / 10,
                    rating_count: agg[0].count,
                });
            }
        } catch (e) {
            console.warn("rating aggregate failed:", e);
        }

        return ok(res, created);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}
