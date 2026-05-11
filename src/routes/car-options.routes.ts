import { Router } from "express";
import {
    getCarOptions,
    createCarOption,
    updateCarOption,
    deleteCarOption,
} from "../controllers/car-options.controller";

const router = Router();

router.get("/", getCarOptions);
router.get("/:type", getCarOptions);
router.post("/", createCarOption);
router.put("/:id", updateCarOption);
router.delete("/:id", deleteCarOption);

export default router;
