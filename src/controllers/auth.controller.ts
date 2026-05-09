import { Request, Response } from 'express';
import bcrypt from "bcrypt";
import { signToken } from '../utils/jwt_2';

export const login = async (req: Request, res: Response) => {
    const adminPhone = process.env.ADMIN_PHONE;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const adminUserId = process.env.ADMIN_USER_ID || '123456';

    if (!adminPhone || !adminPasswordHash) {
        console.error("ADMIN_PHONE or ADMIN_PASSWORD_HASH not configured in env");
        return res.status(503).json({ message: "Admin login not configured" });
    }

    const { phone, password } = req.body ?? {};
    if (typeof phone !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Invalid request' });
    }

    if (phone !== adminPhone) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, adminPasswordHash);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ id: adminUserId, role: 'ADMIN' });

    return res.json({
        message: 'Login successful',
        token,
    });
};
