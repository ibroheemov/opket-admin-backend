import { WorkingAreaDocument, WorkingAreaModel } from '../models/WorkingAreaModel';

export class WorkingAreaService {
    getAll() {
        return WorkingAreaModel.find().lean();
    }

    create(data: { name: string; polygon: { lat: number; lng: number }[]; fareMultiplierOutside?: number }) {
        return WorkingAreaModel.create(data);
    }

    update(id: string, data: Partial<WorkingAreaDocument>) {
        return WorkingAreaModel.findByIdAndUpdate(id, data, { new: true });
    }

    remove(id: string) {
        return WorkingAreaModel.findByIdAndDelete(id);
    }
}
