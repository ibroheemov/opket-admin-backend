import RideOption from "../models/RideOption";
import { Request, Response } from "express";

export const createOption = async (req: Request, res: Response) => {
    try {
        const service = new RideOption(req.body);
        const saved = await service.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ error });
    }
};

export const getOptions = async (req: Request, res: Response) => {
    try {
        const services = await RideOption.find({ type: req.params.type }).sort({ sort_order: 1 });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error });
    }
};

export const getOptionById = async (req: Request, res: Response) => {
    try {
        const service = await RideOption.findById(req.params.id);
        if (!service) return res.status(404).json({ message: "Not found" });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error });
    }
};

export const updateOption = async (req: Request, res: Response) => {
    try {
        const updated = await RideOption.findByIdAndUpdate(
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


export const deleteOption = async (req: Request, res: Response) => {
    try {
        const deleted = await RideOption.findByIdAndDelete(req.params.id);

        if (!deleted) return res.status(404).json({ message: "Not found" });

        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error });
    }
};