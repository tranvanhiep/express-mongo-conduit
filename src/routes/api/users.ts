import { auth, AuthPayload } from '@middlewares/auth';
import { NextFunction, Request, Response, Router } from 'express';
import { Request as JwtRequest } from 'express-jwt';
import models from '@models/index';
import passport from 'passport';

const router: Router = Router();

router.post(
  '/users/login',
  (req: Request, res: Response, next: NextFunction) => {
    const userBody = req.body?.user;
    if (!userBody) {
      res.sendStatus(400);
    }

    if (!userBody?.email) {
      res.status(400).json({ errors: { email: "can't be blank" } });
    }

    if (!userBody?.password) {
      res.status(400).json({ errors: { password: "can't be blank" } });
    }

    passport.authenticate(
      'local',
      { session: false },
      (err, user, info): void => {
        if (err) {
          return next(err);
        }

        if (!user) {
          res.status(422).json(info);
        }

        user.token = user.generateJwt();
        res.json({ user: user.getUserInfo(true) });
      }
    )(req, res, next);
  }
);

router.post(
  '/users',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userBody = req.body?.user;

    if (!userBody) {
      res.sendStatus(400);
    }

    const { username, email, password } = userBody;

    if (!username) {
      res.status(400).json({ errors: { username: "can't be blank" } });
    }

    if (!email) {
      res.status(400).json({ errors: { email: "can't be blank" } });
    }

    if (!password) {
      res.status(400).json({ errors: { password: "can't be blank" } });
    }

    const user = new models.User({ username, email });
    user.setPassword(password);

    try {
      await user.save();
      res.json({ user: user.getUserInfo(true) });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/user',
  auth.required,
  async (
    req: JwtRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await models.User.findById(req.auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      res.json({ user: user.getUserInfo() });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/user',
  auth.required,
  async (
    req: JwtRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userBody = req.body?.user;

    if (!userBody) {
      res.sendStatus(400);
    }

    try {
      const user = await models.User.findById(req.auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      const { email, username, bio, image, password } = userBody;

      if (email !== undefined) {
        user.email = email;
      }

      if (username !== undefined) {
        user.username = username;
      }

      if (bio !== undefined) {
        user.bio = bio;
      }

      if (image !== undefined) {
        user.image = image;
      }

      if (password !== undefined) {
        user.setPassword(password);
      }

      await user.save();
      res.json({ user: user.getUserInfo() });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
