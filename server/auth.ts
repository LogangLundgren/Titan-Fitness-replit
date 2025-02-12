import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, coaches, clients, insertUserSchema } from "@db/schema";
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
      isPublicProfile: boolean | null;
      profilePictureUrl: string | null;
      profileData?: {
        id: number;
        uuid: string;
        userId: number;
        bio: string | null;
        experience: string | null;
        certifications: string | null;
        specialties: string | null;
        socialLinks: Record<string, string> | null;
        isPublicProfile: boolean | null;
        profilePictureUrl: string | null;
        // Client-specific fields
        height?: string | null;
        weight?: string | null;
        fitnessGoals?: string | null;
        medicalConditions?: string | null;
        dietaryRestrictions?: string | null;
      } | null;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "fitcoach-secret",
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to ensure new sessions are saved
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Changed to false for development
      httpOnly: true,
      sameSite: 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // Clear expired entries every 24h
      stale: false // Don't serve stale data
    }),
    name: 'titan.sid' // Custom session ID name
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie.secure = true;
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

        // Create authenticated user object with proper type handling
        const authenticatedUser: Express.User = {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          email: user.email,
          accountType: user.accountType as 'client' | 'coach',
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          experience: user.experience,
          certifications: user.certifications,
          specialties: user.specialties,
          socialLinks: user.socialLinks as Record<string, string> | null,
          isPublicProfile: user.isPublicProfile,
          profilePictureUrl: user.profilePictureUrl,
          profileData: profileData ? {
            ...profileData,
            socialLinks: profileData.socialLinks as Record<string, string> | null,
          } : null
        };

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

      // Create deserialized user object with proper type handling
      const deserializedUser: Express.User = {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        accountType: user.accountType as 'client' | 'coach',
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        experience: user.experience,
        certifications: user.certifications,
        specialties: user.specialties,
        socialLinks: user.socialLinks as Record<string, string> | null,
        isPublicProfile: user.isPublicProfile,
        profilePictureUrl: user.profilePictureUrl,
        profileData: profileData ? {
          ...profileData,
          socialLinks: profileData.socialLinks as Record<string, string> | null,
        } : null
      };

      console.log(`[Auth] User fully deserialized: ${deserializedUser.uuid}`);
      done(null, deserializedUser);
    } catch (err) {
      console.error('[Auth] Error during deserialization:', err);
      done(err);
    }
  });

  // Login endpoint with improved error handling
  app.post("/api/login", (req, res, next) => {
    console.log('[Auth] Processing login request:', req.body);

    if (!req.body.username || !req.body.password) {
      return res.status(400).json({
        error: "Missing credentials",
        message: "Username and password are required"
      });
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('[Auth] Login failed:', info.message);
        return res.status(400).json({
          error: "Authentication failed",
          message: info.message ?? "Login failed"
        });
      }

      // Regenerate session before login to prevent session fixation
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

          // Save session explicitly
          req.session.save((err) => {
            if (err) {
              console.error('[Auth] Session save failed:', err);
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
              },
            });
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const userUuid = req.user?.uuid;
    console.log(`[Auth] Processing logout request for user: ${userUuid}`);

    if (!req.user) {
      return res.status(401).json({
        error: "Not authenticated",
        message: "No user to logout"
      });
    }

    // Destroy session completely
    req.session.destroy((err) => {
      if (err) {
        console.error('[Auth] Logout failed:', err);
        return res.status(500).json({
          error: "Logout failed",
          message: "Failed to destroy session"
        });
      }
      console.log(`[Auth] Logout successful: ${userUuid}`);
      res.clearCookie('titan.sid'); // Clear session cookie
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      console.log(`[Auth] User data requested: ${req.user.uuid}`);
      return res.json(req.user);
    }
    console.log('[Auth] Unauthorized user data request');
    res.status(401).json({
      error: "Not authenticated",
      message: "Please log in to access this resource"
    });
  });
}