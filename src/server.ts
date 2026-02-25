import express from 'express';
import authRoutes from './routes/auth.routes';
import ridesRoutes from './routes/ride.routes';
import driverRoutes from './routes/driver.routes';
import menuRoutes from './routes/menu.routes';
import foodRoutes from './routes/food.routes';
import restaurantsRoutes from './routes/restaurants.routes';
import { authenticate } from './middleware/auth.middleware';
import cors from "cors";
import { config } from './config/env';
import { connectDB } from './utils/db';
import bodyParser from "body-parser";
import { adminRouter } from './routes/admin.routes';
import { connectRedis } from './utils/redisClient';

const app = express();

app.use(bodyParser.json());

// ✅ CORS — MUST be before routes
app.use(cors());

async function startServer() {
    await connectDB();
    await connectRedis();

    // routes
    app.use('/auth', authRoutes);
    app.use('/ride', ridesRoutes);
    app.use('/drivers', driverRoutes);
    app.use("/menu", menuRoutes);
    app.use("/food", foodRoutes);
    app.use("/restaurants", restaurantsRoutes);
    app.use("/admin", adminRouter);

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