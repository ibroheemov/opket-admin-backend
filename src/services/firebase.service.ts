import admin from "firebase-admin";
import { config } from "../config/env";

export function initFirebase() {
    if (admin.apps.length) return;
    const serviceAccount = JSON.parse(config.FIREBASE_ADMIN_SA);
    admin.initializeApp({
        credential: admin.credential.cert({
            ...serviceAccount,
            private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
    });
}

export type FcmPayload = {
    title: string;
    body: string;
};

export type FcmBatchResult = {
    successCount: number;
    failureCount: number;
    failedTokens: string[];
};

export async function sendFcmToTokens(
    tokens: string[],
    payload: FcmPayload
): Promise<FcmBatchResult> {
    if (!tokens.length) {
        return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        android: {
            notification: {
                sound: "notification_sound",
                channelId: "general_notifications_v8",
            },
        },
        apns: {
            payload: { aps: { sound: "default" } },
        },
    });

    const failedTokens: string[] = [];
    res.responses.forEach((r, i) => {
        if (!r.success) failedTokens.push(tokens[i]);
    });

    return {
        successCount: res.successCount,
        failureCount: res.failureCount,
        failedTokens,
    };
}
