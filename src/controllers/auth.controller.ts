import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../types/user';

// ⚠️ Fake user (later replace with DB)
const adminUser: User = {
    id: 1,
    phone: '992707255',
    password: bcrypt.hashSync('op#ke$@t_ad$m&in_$hig*hsc0re$', 10),
    role: 'admin',
};

export const login = async (req: Request, res: Response) => {
    const { phone, password } = req.body;

    // 1. Check email
    if (phone !== adminUser.phone) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Check password
    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Create token
    const token = jwt.sign(
        { id: adminUser.id, role: adminUser.role },
        'SECRET_KEY', // later move to .env
        { expiresIn: '1h' }
    );

    return res.json({
        message: 'Login successful',
        token,
    });
};
