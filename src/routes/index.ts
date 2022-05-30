import express, { Router } from 'express';
import apiRouter from '@routes/api';

const router: Router = express.Router();

router.use('/api', apiRouter);

export default router;
