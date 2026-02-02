import express from 'express';
import authRoutes from './routes/auth.routes';
import ridesRoutes from './routes/ride.routes';
import { authenticate } from './middleware/auth.middleware';
import cors from "cors";
import { config } from './config/env';
import { connectDB } from './utils/db';

const app = express();

app.use(express.json());

// ✅ CORS — MUST be before routes
app.use(
    cors({
        origin: "http://localhost:5173", // React (Vite)
        credentials: true,              // only if using cookies
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);



async function startServer() {
    await connectDB();

    // routes
    app.use('/auth', authRoutes);
    app.use('/ride', ridesRoutes);

    // protected example route
    app.get('/admin', authenticate, (req, res) => {
        res.json({ message: 'Welcome admin 👋' });
    });

    const PORT = config.PORT;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();