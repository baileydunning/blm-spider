import { Router } from 'express';
import { getCampsites, getCampsiteById } from '../../core/services/campsitesService';

const router = Router();

router.get('/', getCampsites);
router.get('/:id', getCampsiteById);

export default router;
