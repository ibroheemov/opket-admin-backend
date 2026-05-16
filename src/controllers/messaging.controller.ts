import { Request, Response } from "express";
import { DriverModel } from "../models/DriverModel";
import { PassengerModel } from "../models/PassengerModel";
import { EskizService, SmsBatchMessage } from "../services/eskiz.service";
import { sendFcmToTokens } from "../services/firebase.service";

export const getTemplates = async (_req: Request, res: Response) => {
    try {
        const templates = await EskizService.getTemplates();
        return res.json({ ok: true, templates });
    } catch (err: any) {
        console.error("getTemplates error:", err);
        return res.status(500).json({ ok: false, message: err?.message ?? "Failed to fetch templates" });
    }
};

type SendMessageBody = {
    targetType: "driver" | "passenger";
    ids: string[] | "all";
    title: string;
    text: string;
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { targetType, ids, title, text } = req.body as SendMessageBody;

        if (!targetType || !text || !title) {
            return res.status(400).json({ ok: false, message: "targetType, title and text are required" });
        }

        const isAll = ids === "all";

        let fcmTokens: string[] = [];
        let smsNumbers: number[] = [];

        if (targetType === "driver") {
            const filter = isAll ? {} : { _id: { $in: ids } };
            const drivers = await DriverModel.find(filter)
                .select("fcmToken notificationEnabled phone")
                .lean();

            for (const d of drivers) {
                if (d.notificationEnabled && d.fcmToken) {
                    fcmTokens.push(d.fcmToken);
                } else if (d.phone) {
                    const num = Number(d.phone.replace(/\D/g, ""));
                    if (!isNaN(num)) smsNumbers.push(num);
                }
            }
        } else {
            const filter = isAll ? {} : { _id: { $in: ids } };
            const passengers = await PassengerModel.find(filter)
                .select("fcmToken notificationEnabled phone")
                .lean();

            for (const p of passengers) {
                if (p.notificationEnabled && p.fcmToken) {
                    fcmTokens.push(p.fcmToken);
                } else if (p.phone) {
                    smsNumbers.push(p.phone);
                }
            }
        }

        let fcmResult = { successCount: 0, failureCount: 0, failedTokens: [] as string[] };
        let smsResult: any = null;

        if (fcmTokens.length) {
            fcmResult = await sendFcmToTokens(fcmTokens, { title, body: text });
        }

        if (smsNumbers.length) {
            const messages: SmsBatchMessage[] = smsNumbers.map((phone, i) => ({
                user_sms_id: `sms${i + 1}`,
                to: Number(`998${phone}`),
                text,
            }));
            smsResult = await EskizService.sendBatch(messages);
        }

        return res.json({
            ok: true,
            fcm: {
                sent: fcmTokens.length,
                successCount: fcmResult.successCount,
                failureCount: fcmResult.failureCount,
            },
            sms: {
                sent: smsNumbers.length,
                result: smsResult,
            },
        });
    } catch (err: any) {
        console.error("sendMessage error:", err);
        return res.status(500).json({ ok: false, message: err?.message ?? "Failed to send message" });
    }
};
