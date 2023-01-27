import router from '@routes/api';
import express, { Router } from 'express';

const routes: Router = express.Router();

routes.use('/api', router);

export default routes;
