import { Request, Response } from "express";
import { ItemOptionGroupModel } from "../models/ItemOptionGroup";
import { ItemOptionModel } from "../models/ItemOption";

/** GROUPS */

/** GET /items/:id/option-groups */
export const listOptionGroups = async (req: Request, res: Response) => {
    const groups = await ItemOptionGroupModel.find({ itemId: req.params.id }).lean();
    res.json({ success: true, groups });
};

/** POST /items/:id/option-groups */
export const createOptionGroup = async (req: Request, res: Response) => {
    const group = await ItemOptionGroupModel.create({
        ...req.body,
        itemId: req.params.id,
    });
    res.json({ success: true, group });
};

/** PATCH /option-groups/:id */
export const updateOptionGroup = async (req: Request, res: Response) => {
    const group = await ItemOptionGroupModel.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
    ).lean();

    res.json({ success: true, group });
};

/** DELETE /option-groups/:id */
export const deleteOptionGroup = async (req: Request, res: Response) => {
    await ItemOptionGroupModel.findByIdAndDelete(req.params.id);
    await ItemOptionModel.deleteMany({ groupId: req.params.id });
    res.json({ success: true });
};

/** OPTIONS */

/** GET /option-groups/:id/options */
export const listOptions = async (req: Request, res: Response) => {
    const options = await ItemOptionModel.find({ groupId: req.params.id }).lean();
    res.json({ success: true, options });
};

/** POST /option-groups/:id/options */
export const createOption = async (req: Request, res: Response) => {
    const option = await ItemOptionModel.create({
        ...req.body,
        groupId: req.params.id,
    });
    res.json({ success: true, option });
};

/** PATCH /options/:id */
export const updateOption = async (req: Request, res: Response) => {
    const option = await ItemOptionModel.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
    ).lean();

    res.json({ success: true, option });
};

/** DELETE /options/:id */
export const deleteOption = async (req: Request, res: Response) => {
    await ItemOptionModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
};