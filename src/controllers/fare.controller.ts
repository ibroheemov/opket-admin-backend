// src/controllers/fareController.ts
import { Request, Response } from "express";
import { FareConfigModel } from "../models/FareConfigModel";

// CRUD
export const createFare = async (req: Request, res: Response) => {
    try {
        const service = new FareConfigModel(req.body);
        const saved = await service.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ error });
    }
};

export const getFares = async (req: Request, res: Response) => {
    try {
        const services = await FareConfigModel.find();
        res.json(services);
    } catch (error) {
        res.status(500).json({ error });
    }
};

export const getFareByType = async (req: Request, res: Response) => {
    try {
        const service = await FareConfigModel.findOne({ type: req.params.type });
        if (!service) return res.status(404).json({ message: "Not found" });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error });
    }
};

export const updateFare = async (req: Request, res: Response) => {
    try {
        const updated = await FareConfigModel.findByIdAndUpdate(
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


export const deleteFare = async (req: Request, res: Response) => {
    try {
        const deleted = await FareConfigModel.findByIdAndDelete(req.params.id);

        if (!deleted) return res.status(404).json({ message: "Not found" });

        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error });
    }
};