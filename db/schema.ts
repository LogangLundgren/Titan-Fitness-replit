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
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const programExercises = pgTable("program_exercises", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id),
  name: text("name").notNull(),
  description: text("description"),
  sets: integer("sets"),
  reps: text("reps"), // Can be "8-12" or "12,10,8"
  restTime: text("rest_time"),
  notes: text("notes"),
  order: integer("order").notNull(),
});

export const programSchedule = pgTable("program_schedule", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  name: text("name").notNull(), // e.g., "Push Day", "Pull Day"
  notes: text("notes"),
});

export const clientPrograms = pgTable("client_programs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  programId: integer("program_id").references(() => programs.id),
  active: boolean("active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  completedWorkouts: integer("completed_workouts").default(0),
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
  exercises: many(programExercises),
  schedule: many(programSchedule),
}));

export const programExerciseRelations = relations(programExercises, ({ one }) => ({
  program: one(programs, {
    fields: [programExercises.programId],
    references: [programs.id],
  }),
}));

export const programScheduleRelations = relations(programSchedule, ({ one }) => ({
  program: one(programs, {
    fields: [programSchedule.programId],
    references: [programs.id],
  }),
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
export type ProgramExercise = typeof programExercises.$inferSelect;
export type ProgramSchedule = typeof programSchedule.$inferSelect;
export type ClientProgram = typeof clientPrograms.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type MealLog = typeof mealLogs.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type BetaSignup = typeof betaSignups.$inferSelect;
export const insertBetaSignupSchema = createInsertSchema(betaSignups);
export const selectBetaSignupSchema = createSelectSchema(betaSignups);