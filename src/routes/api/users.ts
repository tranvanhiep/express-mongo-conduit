import { authorization, AuthPayload } from '@middlewares/auth';
import User from '@models/User';
import { NextFunction, Request, Response, Router } from 'express';
import { Request as JwtRequest } from 'express-jwt';
import passport from 'passport';

const users: Router = Router();

users.post(
  '/users/login',
  (req: Request, res: Response, next: NextFunction): void => {
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

        res.json({ user: user.getUserInfo() });
      }
    )(req, res, next);
  }
);

users.post(
  '/users',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const user = await User.create({ username, email });
      user.setPassword(password);

      await user.save();
      res.json({ user: user.getUserInfo() });
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
      const user = await User.findById(req.auth?.id).exec();

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
    const { auth, body } = req;

    if (!body?.user) {
      res.sendStatus(422);
    }

    try {
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      const { email, username, bio, image, password } = body.user;

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

      await user.save({ validateModifiedOnly: true });
      res.json({ user: user.getUserInfo() });
    } catch (error) {
      next(error);
    }
  }
);

export default users;
