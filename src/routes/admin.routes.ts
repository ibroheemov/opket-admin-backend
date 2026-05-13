import { Router } from "express";
import {
    createRestaurantOwner,
    getRestaurantOwners,
    getReferralBonusSettings,
    updateReferralBonusSettings,
    getPassengerReferralBonusSettings,
    updatePassengerReferralBonusSettings,
    getReferralZoneSettings,
    updateReferralZoneSettings,
} from "../controllers/admin.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { upload } from "../middleware/upload";
import { createRestaurantType, deleteRestaurantType, listRestaurantTypes, updateRestaurantType } from "../controllers/restaurantTypes.controller";
import { getOrderStats } from "../controllers/stats.controller";
import { getDiscountConfig, updateDiscountConfig } from "../controllers/discount.controller";
import {
    listCancelReasons,
    createCancelReason,
    updateCancelReason,
    deleteCancelReason,
    resetCancelReasonCount,
} from "../controllers/cancellationReason.controller";

export const adminRouter = Router();

// adminRouter.use(requireAuth);
// adminRouter.use(requireRole("ADMIN"));

adminRouter.post("/restaurant-owners", requireAuth, requireRole("ADMIN"), createRestaurantOwner);
adminRouter.get("/restaurant-owners", requireAuth, requireRole("ADMIN"), getRestaurantOwners);

adminRouter.get("/restaurant-types", listRestaurantTypes);
adminRouter.post("/restaurant-types", requireAuth, upload.single("image"), createRestaurantType);
adminRouter.patch("/restaurant-types/:id", requireAuth, upload.single("image"), updateRestaurantType);
adminRouter.delete("/restaurant-types/:id", requireAuth, deleteRestaurantType);

adminRouter.get("/orders/stats", getOrderStats);

adminRouter.get("/settings/referral-bonus", getReferralBonusSettings);
adminRouter.put("/settings/referral-bonus", updateReferralBonusSettings);

adminRouter.get("/settings/passenger-referral-bonus", getPassengerReferralBonusSettings);
adminRouter.put("/settings/passenger-referral-bonus", updatePassengerReferralBonusSettings);

adminRouter.get("/settings/referral-zone", getReferralZoneSettings);
adminRouter.put("/settings/referral-zone", updateReferralZoneSettings);

adminRouter.get("/settings/discount-config", getDiscountConfig);
adminRouter.put("/settings/discount-config", updateDiscountConfig);

adminRouter.get("/cancel-reasons", listCancelReasons);
adminRouter.post("/cancel-reasons", createCancelReason);
adminRouter.patch("/cancel-reasons/:id", updateCancelReason);
adminRouter.delete("/cancel-reasons/:id", deleteCancelReason);
adminRouter.post("/cancel-reasons/:id/reset-count", resetCancelReasonCount);