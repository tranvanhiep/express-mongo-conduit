import { authorization, AuthPayload } from '@middlewares/auth';
import { NextFunction, Request, Response, Router } from 'express';
import { Request as JwtRequest } from 'express-jwt';
import models from '@models/index';
import passport from 'passport';

const users: Router = Router();

users.post(
  '/users/login',
  (req: Request, res: Response, next: NextFunction) => {
    const userBody = req.body?.user;
    if (!userBody) {
      res.sendStatus(422);
    }

    if (!userBody?.email) {
      res.status(422).json({ errors: { email: "can't be blank" } });
    }

    if (!userBody?.password) {
      res.status(422).json({ errors: { password: "can't be blank" } });
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

users.post(
  '/users',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userBody = req.body?.user;

    if (!userBody) {
      res.sendStatus(422);
    }

    const { username, email, password } = userBody;

    if (!username) {
      res.status(422).json({ errors: { username: "can't be blank" } });
    }

    if (!email) {
      res.status(422).json({ errors: { email: "can't be blank" } });
    }

    if (!password) {
      res.status(422).json({ errors: { password: "can't be blank" } });
    }

    const user = await models.User.create({ username, email });
    user.setPassword(password);

    try {
      await user.save();
      res.json({ user: user.getUserInfo(true) });
    } catch (error) {
      next(error);
    }
  }
);

users.get(
  '/user',
  authorization.required,
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

users.put(
  '/user',
  authorization.required,
  async (
    req: JwtRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userBody = req.body?.user;

    if (!userBody) {
      res.sendStatus(422);
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

export default users;
