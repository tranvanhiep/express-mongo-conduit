import { auth, AuthPayload } from '@middlewares/auth';
import { UserDocument } from '@models/User';
import { NextFunction, Response, Router } from 'express';
import models from '@models/index';
import { Request as JwtRequest } from 'express-jwt';

const router: Router = Router();

interface ProfileRequest extends JwtRequest<AuthPayload> {
  profile?: UserDocument;
}

router.param(
  'username',
  async (
    req: ProfileRequest,
    res: Response,
    next: NextFunction,
    username: string
  ): Promise<void> => {
    try {
      const profile = await models.User.findOne({ username }).exec();

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

router.get(
  '/:username',
  auth.optional,
  async (
    req: ProfileRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { profile, auth } = req;
    if (!auth?.id) {
      res.json({ profile: profile?.getProfileInfo() });
    }

    try {
      const user: UserDocument = await models.User.findById(auth?.id).exec();

      if (!user) {
        res.json({ profile: profile?.getProfileInfo() });
      }

      res.json({ profile: profile?.getProfileInfo(user) });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:username/follow',
  auth.required,
  async (
    req: ProfileRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { profile, auth } = req;

    if (!auth?.id) {
      res.sendStatus(401);
    }

    try {
      const user: UserDocument = await models.User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      if (
        !user.following?.some((follower) => follower._id === profile?._id) &&
        profile?._id !== user._id
      ) {
        user.following?.push(profile!);
        await user.save();
      }

      res.json({ profile: profile?.getProfileInfo(user) });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:username/follow',
  auth.required,
  async (
    req: ProfileRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { profile, auth } = req;

    if (!auth?.id) {
      res.sendStatus(401);

      return;
    }

    try {
      const user = await models.User.findById(auth.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      const idx: number = (user.following || []).findIndex(
        (follower) => follower._id === profile?._id
      );

      if (idx >= 0) {
        user.following?.splice(idx, 1);
        await user.save();
      }

      res.json({ profile: profile?.getProfileInfo(user) });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
