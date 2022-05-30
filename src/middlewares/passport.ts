import { IUser, UserModel } from '@app/models/User';
import { model } from 'mongoose';
import passport from 'passport';
import { Strategy } from 'passport-local';

const User: UserModel = model<IUser, UserModel>('User');

passport.use(
  new Strategy(
    {
      usernameField: 'user[email]',
      passwordField: 'user[password]',
    },
    async (email: string, password: string, done): Promise<void> => {
      try {
        const user = await User.findOne({ email }).exec();

        if (!user || !user.validPassword(password)) {
          return done(null, false, {
            message: 'email or password is invalid',
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);
