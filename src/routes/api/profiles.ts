import { authorization, AuthPayload } from '@middlewares/auth';
import User, { UserDocument } from '@models/User';
import { NextFunction, Response, Router } from 'express';
import { Request as JwtRequest } from 'express-jwt';

const profiles: Router = Router();

interface ProfileRequest<T = {}> extends JwtRequest<T> {
  profile?: UserDocument;
}

profiles.param(
  'username',
  async (
    req: ProfileRequest,
    res: Response,
    next: NextFunction,
    username: string
  ): Promise<void> => {
    try {
      const profile = await User.findOne({ username }).exec();

      if (!profile) {
        res.sendStatus(404);

        return;
      }

      req.profile = profile;
      next();
    } catch (error) {
      next(error);
    }
  }
);

profiles.get(
  '/:username',
  authorization.optional,
  async (
    req: ProfileRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { profile, auth } = req;

      if (!auth?.id) {
        res.json({ profile: profile!.getProfileInfo() });

        return;
      }

      const user: UserDocument = await User.findById(auth.id).exec();

      res.json({ profile: profile!.getProfileInfo(user) });
    } catch (error) {
      next(error);
    }
  }
);

profiles.post(
  '/:username/follow',
  authorization.required,
  async (
    req: ProfileRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { profile, auth } = req;
      const user: UserDocument = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      user.follow(profile!._id);
      res.json({ profile: profile!.getProfileInfo(user) });
    } catch (error) {
      next(error);
    }
  }
);

profiles.delete(
  '/:username/follow',
  authorization.required,
  async (
    req: ProfileRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { profile, auth } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      user.unfollow(profile!._id);
      res.json({ profile: profile!.getProfileInfo(user) });
    } catch (error) {
      next(error);
    }
  }
);

export default profiles;
