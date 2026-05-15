import { Request, Response } from "express";
import { ReferralRecordModel } from "../models/ReferralRecordModel";
import { DriverModel } from "../models/DriverModel";
import { PassengerModel } from "../models/PassengerModel";
import { SettingsModel, SETTINGS_KEYS } from "../models/SettingsModel";

function bad(res: Response, code: number, message: string) {
    return res.status(code).json({ ok: false, message });
}

// GET /admin/referrals?status=pending_location&page=1&pageSize=20
export const listReferrals = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
        const skip = (page - 1) * pageSize;
        const status = typeof req.query.status === "string" ? req.query.status : undefined;

        const filter: Record<string, any> = {};
        if (status) filter.status = status;

        const [records, total] = await Promise.all([
            ReferralRecordModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
            ReferralRecordModel.countDocuments(filter),
        ]);

        // Populate referrer driver info
        const referrerIds = [...new Set(records.map((r) => String(r.referrerId)))];
        const referrers = await DriverModel.find({ _id: { $in: referrerIds } })
            .select("_id firstname lastname phone")
            .lean();
        const referrerMap = Object.fromEntries(referrers.map((d) => [String(d._id), d]));

        // Populate referred user info (driver or passenger separately)
        const driverIds = records
            .filter((r) => r.referredUserType === "driver")
            .map((r) => String(r.referredId));
        const passengerIds = records
            .filter((r) => r.referredUserType === "passenger")
            .map((r) => String(r.referredId));

        const [referredDrivers, referredPassengers] = await Promise.all([
            driverIds.length
                ? DriverModel.find({ _id: { $in: driverIds } })
                      .select("_id firstname lastname phone")
                      .lean()
                : [],
            passengerIds.length
                ? PassengerModel.find({ _id: { $in: passengerIds } })
                      .select("_id phone")
                      .lean()
                : [],
        ]);

        const driverMap = Object.fromEntries(referredDrivers.map((d) => [String(d._id), d]));
        const passengerMap = Object.fromEntries(referredPassengers.map((p) => [String(p._id), p]));

        const enriched = records.map((r) => {
            const referred =
                r.referredUserType === "driver"
                    ? driverMap[String(r.referredId)]
                    : passengerMap[String(r.referredId)];
            return {
                _id: r._id,
                status: r.status,
                referredUserType: r.referredUserType,
                bonusAmount: r.bonusAmount,
                referredLocation: (r as any).referredLocation ?? null,
                createdAt: r.createdAt,
                verifiedAt: r.verifiedAt,
                referrer: referrerMap[String(r.referrerId)] ?? null,
                referred: referred ?? null,
            };
        });

        return res.json({
            ok: true,
            records: enriched,
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
};

// POST /admin/referrals/:id/approve
export const approveReferral = async (req: Request, res: Response) => {
    try {
        const record = await ReferralRecordModel.findById(req.params.id);
        if (!record) return bad(res, 404, "Referral record not found");
        if (record.status !== "pending_location")
            return bad(res, 400, "Only pending referrals can be approved");

        const bonusKey =
            record.referredUserType === "driver"
                ? SETTINGS_KEYS.DRIVER_REFERRAL_BONUS
                : SETTINGS_KEYS.PASSENGER_REFERRAL_BONUS;

        const bonusSetting = await SettingsModel.findOne({ key: bonusKey });
        const bonusAmount = bonusSetting?.value ?? 0;

        await ReferralRecordModel.findByIdAndUpdate(record._id, {
            status: "approved",
            bonusAmount,
            verifiedAt: new Date(),
        });

        if (bonusAmount > 0) {
            await DriverModel.findByIdAndUpdate(record.referrerId, {
                $inc: { referralBonus: bonusAmount, referrals: 1 },
            });
        }

        return res.json({ ok: true, bonusAmount });
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
};

// POST /admin/referrals/:id/reject
export const rejectReferral = async (req: Request, res: Response) => {
    try {
        const record = await ReferralRecordModel.findById(req.params.id);
        if (!record) return bad(res, 404, "Referral record not found");
        if (record.status !== "pending_location")
            return bad(res, 400, "Only pending referrals can be rejected");

        await ReferralRecordModel.findByIdAndUpdate(record._id, {
            status: "rejected",
            verifiedAt: new Date(),
        });

        return res.json({ ok: true });
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
};
