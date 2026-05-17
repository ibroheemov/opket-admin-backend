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
                bonusCredited: (r as any).bonusCredited ?? false,
                autoVerified: (r as any).autoVerified ?? false,
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
//
// Manual override. Referrals are normally decided automatically by the
// zone-radius check the moment the referred user's location arrives, but the
// admin can still force-approve from the approvals page (e.g. to overturn an
// auto-reject). Idempotent: the referrer is credited at most once per record,
// guarded by the `bonusCredited` flag.
export const approveReferral = async (req: Request, res: Response) => {
    try {
        const record = await ReferralRecordModel.findById(req.params.id);
        if (!record) return bad(res, 404, "Referral record not found");

        // Already approved — nothing to do, report the credited amount.
        if (record.status === "approved") {
            return res.json({ ok: true, bonusAmount: record.bonusAmount ?? 0 });
        }

        const bonusKey =
            record.referredUserType === "driver"
                ? SETTINGS_KEYS.DRIVER_REFERRAL_BONUS
                : SETTINGS_KEYS.PASSENGER_REFERRAL_BONUS;

        const bonusSetting = await SettingsModel.findOne({ key: bonusKey });
        const bonusAmount = bonusSetting?.value ?? 0;

        // Flip status to approved (manual override → autoVerified = false).
        await ReferralRecordModel.findByIdAndUpdate(record._id, {
            status: "approved",
            autoVerified: false,
            verifiedAt: new Date(),
        });

        // Credit the referrer exactly once: atomically claim the credit by
        // flipping bonusCredited false → true. Only the claiming request
        // increments the driver's balance.
        if (bonusAmount > 0) {
            const claimed = await ReferralRecordModel.findOneAndUpdate(
                { _id: record._id, bonusCredited: false },
                { bonusCredited: true, bonusAmount },
                { new: true }
            );
            if (claimed) {
                await DriverModel.findByIdAndUpdate(record.referrerId, {
                    $inc: { referralBonus: bonusAmount, referrals: 1 },
                });
            }
        } else {
            // Bonus disabled — keep the recorded amount accurate.
            await ReferralRecordModel.findOneAndUpdate(
                { _id: record._id, bonusCredited: false },
                { bonusAmount: 0 }
            );
        }

        return res.json({ ok: true, bonusAmount });
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
};

// POST /admin/referrals/:id/reject
//
// Manual override. Force-rejects a referral. If a bonus was already credited
// (auto-approved earlier, or approved by mistake), it is reversed off the
// referrer driver. Idempotent and safe to call repeatedly.
export const rejectReferral = async (req: Request, res: Response) => {
    try {
        const record = await ReferralRecordModel.findById(req.params.id);
        if (!record) return bad(res, 404, "Referral record not found");

        if (record.status === "rejected") {
            return res.json({ ok: true });
        }

        // Atomically claim the reversal: only the request that flips
        // bonusCredited true → false owes the driver a debit.
        const reversed = await ReferralRecordModel.findOneAndUpdate(
            { _id: record._id, bonusCredited: true },
            { bonusCredited: false },
            { new: false } // return the pre-update doc to read its bonusAmount
        );

        await ReferralRecordModel.findByIdAndUpdate(record._id, {
            status: "rejected",
            autoVerified: false,
            verifiedAt: new Date(),
        });

        const reversedAmount = reversed?.bonusAmount ?? 0;
        if (reversed && reversedAmount > 0) {
            await DriverModel.findByIdAndUpdate(record.referrerId, {
                $inc: { referralBonus: -reversedAmount, referrals: -1 },
            });
        }

        return res.json({ ok: true });
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
};
