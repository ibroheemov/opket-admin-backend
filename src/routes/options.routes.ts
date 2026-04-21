import { Router } from 'express';
import { createOption, deleteOption, getOptionById, getOptions, updateOption } from '../controllers/options.controller';


const router = Router();

router.post('/', createOption);
router.get('/', getOptions);
router.get('/:type', getOptions);
router.get('/:id', getOptionById);
router.put('/:id', updateOption);
router.delete('/:id', deleteOption);

export default router;
