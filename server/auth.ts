import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, coaches, clients, insertUserSchema, type User } from "@db/schema";
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
      fullName?: string;
      phoneNumber?: string;
      bio?: string;
      experience?: string;
      certifications?: string;
      specialties?: string;
      socialLinks?: Record<string, string>;
      isPublicProfile?: boolean;
      profilePictureUrl?: string;
      profileData?: {
        id: number;
        uuid: string;
        userId: number;
        bio?: string;
        experience?: string;
        certifications?: string;
        specialties?: string;
        socialLinks?: Record<string, string>;
        isPublicProfile?: boolean;
        profilePictureUrl?: string;
        // Client-specific fields
        height?: string;
        weight?: string;
        fitnessGoals?: string;
        medicalConditions?: string;
        dietaryRestrictions?: string;
      };
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "fitcoach-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: app.get("env") === "production",
      httpOnly: true,
      sameSite: 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // Clear expired entries every 24h
      stale: false // Don't serve stale data
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[Auth] Attempting login for user: ${username}`);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log(`[Auth] User not found: ${username}`);
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log(`[Auth] Invalid password for user: ${username}`);
          return done(null, false, { message: "Incorrect password." });
        }

        console.log(`[Auth] User authenticated successfully: ${user.uuid}`);

        // Fetch additional profile data based on account type
        let profileData = null;
        if (user.accountType === 'coach') {
          const [coachData] = await db
            .select()
            .from(coaches)
            .where(eq(coaches.userId, user.id))
            .limit(1);
          profileData = coachData;
          console.log(`[Auth] Coach profile loaded: ${coachData?.uuid}`);
        } else {
          const [clientData] = await db
            .select()
            .from(clients)
            .where(eq(clients.userId, user.id))
            .limit(1);
          profileData = clientData;
          console.log(`[Auth] Client profile loaded: ${clientData?.uuid}`);
        }

        const authenticatedUser = { ...user, profileData };
        console.log(`[Auth] Complete user object created with UUID: ${authenticatedUser.uuid}`);
        return done(null, authenticatedUser);
      } catch (err) {
        console.error('[Auth] Error during authentication:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`[Auth] Serializing user: ${user.uuid}`);
    done(null, { id: user.id, uuid: user.uuid });
  });

  passport.deserializeUser(async (serialized: { id: number, uuid: string }, done) => {
    try {
      console.log(`[Auth] Deserializing user: ${serialized.uuid}`);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, serialized.id))
        .limit(1);

      if (!user) {
        console.log(`[Auth] User not found during deserialization: ${serialized.uuid}`);
        return done(null, false);
      }

      // Verify UUID matches to prevent session fixation
      if (user.uuid !== serialized.uuid) {
        console.log(`[Auth] UUID mismatch during deserialization: ${serialized.uuid}`);
        return done(null, false);
      }

      // Fetch additional profile data
      let profileData = null;
      if (user.accountType === 'coach') {
        const [coachData] = await db
          .select()
          .from(coaches)
          .where(eq(coaches.userId, user.id))
          .limit(1);
        profileData = coachData;
        console.log(`[Auth] Coach profile reloaded: ${coachData?.uuid}`);
      } else {
        const [clientData] = await db
          .select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);
        profileData = clientData;
        console.log(`[Auth] Client profile reloaded: ${clientData?.uuid}`);
      }

      const deserializedUser = { ...user, profileData };
      console.log(`[Auth] User fully deserialized: ${deserializedUser.uuid}`);
      done(null, deserializedUser);
    } catch (err) {
      console.error('[Auth] Error during deserialization:', err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('[Auth] Processing registration request');
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log('[Auth] Registration validation failed:', result.error.issues);
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, email, password, accountType, fullName, phoneNumber, bio, experience, certifications, specialties, socialLinks, isPublicProfile, profilePictureUrl } = result.data;

      // Check for existing user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log(`[Auth] Registration failed - username exists: ${username}`);
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          accountType: accountType || "client",
          fullName,
          phoneNumber,
        })
        .returning();

      console.log(`[Auth] New user created: ${newUser.uuid}`);

      // Create corresponding profile based on account type
      let profileData = null;
      if (accountType === 'coach') {
        const [coachProfile] = await db
          .insert(coaches)
          .values({
            userId: newUser.id,
            bio,
            experience,
            certifications,
            specialties,
            socialLinks,
            isPublicProfile,
            profilePictureUrl
          })
          .returning();
        profileData = coachProfile;
        console.log(`[Auth] Coach profile created: ${coachProfile.uuid}`);
      } else {
        const [clientProfile] = await db
          .insert(clients)
          .values({
            userId: newUser.id,
            bio,
            socialLinks,
            isPublicProfile,
            profilePictureUrl
          })
          .returning();
        profileData = clientProfile;
        console.log(`[Auth] Client profile created: ${clientProfile.uuid}`);
      }

      // Regenerate session before login
      req.session.regenerate((err) => {
        if (err) {
          console.error('[Auth] Session regeneration failed:', err);
          return next(err);
        }

        const userWithProfile = { ...newUser, profileData };
        req.login(userWithProfile, (err) => {
          if (err) {
            console.error('[Auth] Login after registration failed:', err);
            return next(err);
          }
          console.log(`[Auth] Registration and login completed: ${newUser.uuid}`);
          return res.json({
            message: "Registration successful",
            user: {
              id: newUser.id,
              uuid: newUser.uuid,
              username: newUser.username,
              accountType: newUser.accountType,
              profileData
            },
          });
        });
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('[Auth] Processing login request');
    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('[Auth] Login failed:', info.message);
        return res.status(400).send(info.message ?? "Login failed");
      }

      // Regenerate session before login
      req.session.regenerate((err) => {
        if (err) {
          console.error('[Auth] Session regeneration failed:', err);
          return next(err);
        }

        req.login(user, (err) => {
          if (err) {
            console.error('[Auth] Login session setup failed:', err);
            return next(err);
          }
          console.log(`[Auth] Login successful: ${user.uuid}`);
          return res.json({
            message: "Login successful",
            user: {
              id: user.id,
              uuid: user.uuid,
              username: user.username,
              accountType: user.accountType,
              profileData: user.profileData
            },
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const userUuid = req.user?.uuid;
    console.log(`[Auth] Processing logout request for user: ${userUuid}`);

    // Destroy session completely instead of just logging out
    req.session.destroy((err) => {
      if (err) {
        console.error('[Auth] Logout failed:', err);
        return res.status(500).send("Logout failed");
      }
      console.log(`[Auth] Logout successful: ${userUuid}`);
      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      console.log(`[Auth] User data requested: ${req.user.uuid}`);
      return res.json(req.user);
    }
    console.log('[Auth] Unauthorized user data request');
    res.status(401).send("Not logged in");
  });
}