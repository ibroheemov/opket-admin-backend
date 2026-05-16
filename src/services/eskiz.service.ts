import axios from "axios";
import { config } from "../config/env";

const BASE_URL = "https://notify.eskiz.uz/api";
const FROM = "4546";

let cachedToken: string | null = null;

async function login(): Promise<string> {
    const res = await axios.post<{ data: { token: string } }>(`${BASE_URL}/auth/login`, {
        email: config.ESKIZ_EMAIL,
        password: config.ESKIZ_PASSWORD,
    });
    cachedToken = res.data.data.token;
    return cachedToken;
}

async function refreshToken(): Promise<string> {
    try {
        const res = await axios.patch<{ data: { token: string } }>(
            `${BASE_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${cachedToken}` } }
        );
        cachedToken = res.data.data.token;
        return cachedToken;
    } catch {
        return login();
    }
}

async function getToken(): Promise<string> {
    if (!cachedToken) return login();
    return cachedToken;
}

async function withAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await getToken();
    try {
        return await fn(token);
    } catch (err: any) {
        if (err?.response?.status === 401) {
            const fresh = await refreshToken();
            return fn(fresh);
        }
        throw err;
    }
}

export type EskizTemplate = {
    id: number;
    template: string;
    original_text: string;
    status: string;
};

export type SmsBatchMessage = {
    user_sms_id: string;
    to: number;
    text: string;
};

export const EskizService = {
    async getTemplates(): Promise<EskizTemplate[]> {
        return withAuth(async (token) => {
            const res = await axios.get<{ result: EskizTemplate[] }>(`${BASE_URL}/user/templates`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.data.result;
        });
    },

    async sendBatch(messages: SmsBatchMessage[]): Promise<any> {
        if (!messages.length) return null;
        return withAuth(async (token) => {
            const res = await axios.post(
                `${BASE_URL}/message/sms/send-batch`,
                {
                    messages,
                    from: FROM,
                    dispatch_id: Date.now(),
                    callback_url: "",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return res.data;
        });
    },
};
