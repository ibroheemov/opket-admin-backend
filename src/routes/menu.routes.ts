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

const router = Router();
// router.use(authenticate);

// Categories
router.get("/restaurants/:id/categories", listCategories);
router.post("/restaurants/:id/categories", authenticate, createCategory);
router.patch("/categories/:id", authenticate, updateCategory);
router.delete("/categories/:id", authenticate, deleteCategory);

// Items
router.get("/restaurants/:id/items", listItems);
router.post("/restaurants/:id/items", authenticate, upload.single("image"), createItem);
router.patch("/items/:id", authenticate, upload.single("image"), updateItem);
router.delete("/items/:id", authenticate, deleteItem);

// Modifiers
router.get("/items/:id/option-groups", authenticate, listOptionGroups);
router.post("/items/:id/option-groups", authenticate, createOptionGroup);
router.patch("/option-groups/:id", authenticate, updateOptionGroup);
router.delete("/option-groups/:id", authenticate, deleteOptionGroup);

router.get("/option-groups/:id/options", authenticate, listOptions);
router.post("/option-groups/:id/options", authenticate, createOption);
router.patch("/options/:id", authenticate, updateOption);
router.delete("/options/:id", authenticate, deleteOption);

export default router;