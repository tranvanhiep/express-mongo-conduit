import express, { NextFunction, Request, Response, Router } from 'express';
import users from '@routes/api/users';
import profiles from '@routes/api/profiles';
import { Error } from 'mongoose';

const router: Router = express.Router();

router.use('/', users);
router.use('/profiles', profiles);

router.use(
  (err: any, _req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof Error.ValidationError) {
      res.status(422).json({
        errors: Object.entries(err.errors).reduce(
          (errors, [key, value]) => ({
            ...errors,
            [key]: value?.message,
          }),
          {}
        ),
      });
    }

    next(err);
  }
);

export default router;
