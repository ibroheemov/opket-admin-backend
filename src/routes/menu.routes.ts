import { Router } from "express";

import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/menuCategories.controller";

import {
    listItems,
    createItem,
    updateItem,
    deleteItem,
} from "../controllers/menuItems.controller";

import {
    listOptionGroups,
    createOptionGroup,
    updateOptionGroup,
    deleteOptionGroup,
    listOptions,
    createOption,
    updateOption,
    deleteOption,
} from "../controllers/modifiers.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
// router.use(authenticate);

// Categories
router.get("/restaurants/:id/categories", listCategories);
router.post("/restaurants/:id/categories", requireAuth, createCategory);
router.patch("/categories/:id", requireAuth, updateCategory);
router.delete("/categories/:id", requireAuth, deleteCategory);

// Items
router.get("/restaurants/:id/items", listItems);
router.post("/restaurants/:id/items", requireAuth, upload.single("image"), createItem);
router.patch("/items/:id", requireAuth, upload.single("image"), updateItem);
router.delete("/items/:id", requireAuth, deleteItem);

// Modifiers
router.get("/items/:id/option-groups", requireAuth, listOptionGroups);
router.post("/items/:id/option-groups", requireAuth, createOptionGroup);
router.patch("/option-groups/:id", requireAuth, updateOptionGroup);
router.delete("/option-groups/:id", requireAuth, deleteOptionGroup);

router.get("/option-groups/:id/options", requireAuth, listOptions);
router.post("/option-groups/:id/options", requireAuth, createOption);
router.patch("/options/:id", requireAuth, updateOption);
router.delete("/options/:id", requireAuth, deleteOption);

export default router;