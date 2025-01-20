import { pgTable, text, serial, integer, boolean, timestamp, json, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  accountType: text("account_type").notNull().default("client"),
  fullName: text("full_name"),
  email: text("email"),
  bio: text("bio"),
  phoneNumber: text("phone_number"),
  specialties: text("specialties"),
  certifications: text("certifications"),
  experience: text("experience"),
  socialLinks: json("social_links").$type<{
    instagram?: string;
    twitter?: string;
    website?: string;
  }>(),
  isPublicProfile: boolean("is_public_profile").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "lifting", "diet", "posing", "coaching"
  price: real("price").default(0),
  coachId: integer("coach_id").references(() => users.id),
  data: json("data"), // Exercises, meal plans etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientPrograms = pgTable("client_programs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  programId: integer("program_id").references(() => programs.id),
  active: boolean("active").default(true),
  startDate: timestamp("start_date").defaultNow(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  programId: integer("program_id").references(() => programs.id),
  data: json("data"), // Sets, reps, weights etc.
  date: timestamp("date").defaultNow(),
});

export const mealLogs = pgTable("meal_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  programId: integer("program_id").references(() => programs.id),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fats: integer("fats"),
  data: json("data"), // Detailed food items
  date: timestamp("date").defaultNow(),
});

export const programRelations = relations(programs, ({ one, many }) => ({
  coach: one(users, {
    fields: [programs.coachId],
    references: [users.id],
  }),
  clientPrograms: many(clientPrograms),
}));

export const userRelations = relations(users, ({ many }) => ({
  programs: many(programs),
  enrollments: many(clientPrograms),
  workoutLogs: many(workoutLogs),
  mealLogs: many(mealLogs),
}));

export const clientProgramRelations = relations(clientPrograms, ({ one }) => ({
  client: one(users, {
    fields: [clientPrograms.clientId],
    references: [users.id],
  }),
  program: one(programs, {
    fields: [clientPrograms.programId],
    references: [programs.id],
  }),
}));

export const betaSignups = pgTable("beta_signups", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type ClientProgram = typeof clientPrograms.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type MealLog = typeof mealLogs.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type BetaSignup = typeof betaSignups.$inferSelect;
export const insertBetaSignupSchema = createInsertSchema(betaSignups);
export const selectBetaSignupSchema = createSelectSchema(betaSignups);