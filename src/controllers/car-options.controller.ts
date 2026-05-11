import { Request, Response } from "express";
import CarOption from "../models/CarOption";

export const getCarOptions = async (req: Request, res: Response) => {
    try {
        const filter = req.params.type ? { type: req.params.type } : {};
        const options = await CarOption.find(filter).sort({ sort_order: 1 });
        res.json(options);
    } catch (error) {
        res.status(500).json({ error });
    }
};

export const createCarOption = async (req: Request, res: Response) => {
    try {
        const option = new CarOption(req.body);
        const saved = await option.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ error });
    }
};

export const updateCarOption = async (req: Request, res: Response) => {
    try {
        const updated = await CarOption.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: "Not found" });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error });
    }
};

export const deleteCarOption = async (req: Request, res: Response) => {
    try {
        const deleted = await CarOption.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Not found" });
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error });
    }
};
