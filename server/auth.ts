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

// Define the User interface with all required properties
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  accountType: 'client' | 'coach';
  fullName?: string;
  profileData?: any;
}

declare global {
  namespace Express {
    interface User extends User {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const isProduction = app.get("env") === "production";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "fitcoach-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: isProduction, // Only use secure cookies in production
      httpOnly: true,
      sameSite: isProduction ? 'strict' : 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // Clear expired entries every 24h
      stale: false // Don't serve stale data
    }),
  };

  if (isProduction) {
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

        // Fetch additional profile data based on account type
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

        console.log(`[Auth] Successfully authenticated user: ${username}`);
        return done(null, { ...user, profileData });
      } catch (err) {
        console.error(`[Auth] Error during authentication:`, err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user: User, done) => {
    console.log(`[Auth] Serializing user:`, user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[Auth] Deserializing user:`, id);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log(`[Auth] User not found during deserialization:`, id);
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
      } else {
        const [clientData] = await db
          .select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);
        profileData = clientData;
      }

      console.log(`[Auth] Successfully deserialized user:`, id);
      done(null, { ...user, profileData });
    } catch (err) {
      console.error(`[Auth] Error during deserialization:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log(`[Auth] Processing registration request:`, req.body);

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log(`[Auth] Invalid registration input:`, result.error.issues);
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, email, password, accountType } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log(`[Auth] Username already exists:`, username);
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
        })
        .returning();

      // Create corresponding profile based on account type
      let profileData = null;
      if (accountType === 'coach') {
        const [coachProfile] = await db
          .insert(coaches)
          .values({
            userId: newUser.id,
          })
          .returning();
        profileData = coachProfile;
      } else {
        const [clientProfile] = await db
          .insert(clients)
          .values({
            userId: newUser.id,
          })
          .returning();
        profileData = clientProfile;
      }

      console.log(`[Auth] Successfully registered new user:`, newUser.id);

      // Regenerate session before login
      req.session.regenerate((err) => {
        if (err) return next(err);

        req.login({ ...newUser, profileData }, (err) => {
          if (err) return next(err);
          return res.json({
            message: "Registration successful",
            user: {
              id: newUser.id,
              username: newUser.username,
              accountType: newUser.accountType,
              profileData
            },
          });
        });
      });
    } catch (error) {
      console.error(`[Auth] Error during registration:`, error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log(`[Auth] Processing login request for:`, req.body.username);

    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error(`[Auth] Login error:`, err);
        return next(err);
      }
      if (!user) {
        console.log(`[Auth] Login failed:`, info.message);
        return res.status(400).send(info.message ?? "Login failed");
      }

      // Regenerate session before login
      req.session.regenerate((err) => {
        if (err) return next(err);

        req.login(user, (err) => {
          if (err) return next(err);
          console.log(`[Auth] Login successful for user:`, user.id);
          return res.json({
            message: "Login successful",
            user: {
              id: user.id,
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
    console.log(`[Auth] Processing logout request for user:`, req.user?.id);

    // Destroy session completely instead of just logging out
    req.session.destroy((err) => {
      if (err) {
        console.error(`[Auth] Logout error:`, err);
        return res.status(500).send("Logout failed");
      }
      res.clearCookie('connect.sid'); // Clear session cookie
      console.log(`[Auth] Logout successful`);
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log(`[Auth] Checking authentication status:`, {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id
    });

    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  });
}