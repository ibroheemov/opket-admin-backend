import { Router } from 'express';
import {
    listWorkingAreas,
    createWorkingArea,
    updateWorkingArea,
    deleteWorkingArea,
} from '../controllers/working_area.controller';

const router = Router();

router.get('/', listWorkingAreas);
router.post('/', createWorkingArea);
router.put('/:id', updateWorkingArea);
router.delete('/:id', deleteWorkingArea);

export default router;
