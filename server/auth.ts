import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, coaches, clients } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User {
      id: number;
      uuid: string;
      username: string;
      email: string;
      accountType: 'client' | 'coach';
      fullName: string | null;
      phoneNumber: string | null;
      bio: string | null;
      experience: string | null;
      certifications: string | null;
      specialties: string | null;
      socialLinks: Record<string, string> | null;
      isPublicProfile: boolean;
      profilePictureUrl: string | null;
      profileData?: {
        id: number;
        uuid: string;
        userId: number;
        bio: string | null;
        height?: string | null;
        weight?: string | null;
        fitnessGoals?: string | null;
        medicalConditions?: string | null;
        dietaryRestrictions?: string | null;
        experience?: string | null;
        certifications?: string | null;
        specialties?: string | null;
        socialLinks: Record<string, string> | null;
        isPublicProfile: boolean;
        profilePictureUrl: string | null;
      } | null;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "fitcoach-secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000
    }),
    name: 'titan.sid'
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie!.secure = true;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        let profileData = null;
        if (user.accountType === 'coach') {
          const [coachData] = await db
            .select()
            .from(coaches)
            .where(eq(coaches.userId, user.id))
            .limit(1);
          profileData = coachData;
        } else {
          const [clientData] = await db
            .select()
            .from(clients)
            .where(eq(clients.userId, user.id))
            .limit(1);
          profileData = clientData;
        }

        const authenticatedUser: Express.User = {
          ...user,
          socialLinks: user.socialLinks as Record<string, string> | null,
          isPublicProfile: user.isPublicProfile ?? true,
          profileData: profileData ? {
            ...profileData,
            socialLinks: profileData.socialLinks as Record<string, string> | null,
            isPublicProfile: profileData.isPublicProfile ?? true
          } : null
        };

        return done(null, authenticatedUser);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, { id: user.id, uuid: user.uuid });
  });

  passport.deserializeUser(async (serialized: { id: number; uuid: string }, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, serialized.id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      let profileData = null;
      if (user.accountType === 'coach') {
        const [coachData] = await db
          .select()
          .from(coaches)
          .where(eq(coaches.userId, user.id))
          .limit(1);
        profileData = coachData;
      } else {
        const [clientData] = await db
          .select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);
        profileData = clientData;
      }

      const deserializedUser: Express.User = {
        ...user,
        socialLinks: user.socialLinks as Record<string, string> | null,
        isPublicProfile: user.isPublicProfile ?? true,
        profileData: profileData ? {
          ...profileData,
          socialLinks: profileData.socialLinks as Record<string, string> | null,
          isPublicProfile: profileData.isPublicProfile ?? true
        } : null
      };

      done(null, deserializedUser);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(400).json({
          error: "Authentication failed",
          message: info.message ?? "Login failed"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            accountType: user.accountType,
            profileData: user.profileData
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.clearCookie('titan.sid');
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).json({
      error: "Not authenticated",
      message: "Please log in to access this resource"
    });
  });
}