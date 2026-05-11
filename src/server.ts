import express from 'express';
import authRoutes from './routes/auth.routes';
import rideOptionsRoutes from './routes/options.routes';
import ridesRoutes from './routes/ride.routes';
import driverRoutes from './routes/driver.routes';
import menuRoutes from './routes/menu.routes';
import foodRoutes from './routes/food.routes';
import fareRoutes from "./routes/fare.routes";
import rideSearchConfigRoutes from "./routes/ride.search.config.routes";
import restaurantsRoutes from './routes/restaurants.routes';
import carOptionsRoutes from './routes/car-options.routes';
import publicRoutes from './routes/public.routes';
import { authenticate } from './middleware/auth.middleware';
import cors from "cors";
import { config } from './config/env';
import { connectDB } from './utils/db';
import bodyParser from "body-parser";
import { adminRouter } from './routes/admin.routes';
import { connectRedis } from './utils/redisClient';
import http from "http";
import { initSocketServer } from './gateway/socket';

const app = express();

app.use(bodyParser.json());

// ✅ CORS — MUST be before routes
app.use(cors());

async function startServer() {
    await connectDB();
    await connectRedis();
    const server = http.createServer(app);
    initSocketServer(server);

    // routes
    app.use('/ride-options', rideOptionsRoutes);
    app.use('/auth', authRoutes);
    app.use('/ride', ridesRoutes);
    app.use('/drivers', driverRoutes);
    app.use("/menu", menuRoutes);
    app.use("/food", foodRoutes);
    app.use("/restaurants", restaurantsRoutes);
    app.use("/public", publicRoutes);
    app.use("/admin", adminRouter);
    app.use("/fare", fareRoutes);
    app.use("/ride-search-config", rideSearchConfigRoutes);
    app.use("/car-options", carOptionsRoutes);


    // protected example route
    app.get('/admin', authenticate, (req, res) => {
        res.json({ message: 'Welcome admin 👋' });
    });

    const PORT = config.PORT;
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();