import { Request, Response } from 'express';
import { WorkingAreaService } from '../services/working_area.service';

const service = new WorkingAreaService();

export const listWorkingAreas = async (_req: Request, res: Response) => {
    try {
        const areas = await service.getAll();
        res.json({ success: true, areas });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const createWorkingArea = async (req: Request, res: Response) => {
    try {
        const { name, polygon, fareMultiplierOutside } = req.body;
        if (!name || !Array.isArray(polygon) || polygon.length < 3) {
            return res.status(400).json({ error: 'Invalid area data' });
        }
        const area = await service.create({ name, polygon, fareMultiplierOutside });
        res.status(201).json(area);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateWorkingArea = async (req: Request, res: Response) => {
    try {
        const area = await service.update(req.params.id, req.body);
        if (!area) return res.status(404).json({ error: 'Area not found' });
        res.json(area);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteWorkingArea = async (req: Request, res: Response) => {
    try {
        const area = await service.remove(req.params.id);
        if (!area) return res.status(404).json({ error: 'Area not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
