import { pgTable, text, serial, integer, boolean, timestamp, json, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

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
  socialLinks: jsonb("social_links").default('{}'),
  isPublicProfile: boolean("is_public_profile").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  price: real("price").default(0),
  coachId: integer("coach_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isPublic: boolean("is_public").default(false),
  cycleLength: integer("cycle_length"),
  status: text("status").default("active"),
  mealPlans: jsonb("meal_plans").default('{}'),
  posingDetails: jsonb("posing_details").default('{}'),
});

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dayOfWeek: integer("day_of_week"),
  orderInCycle: integer("order_in_cycle"),
  notes: text("notes"),
});

export const programSchedule = pgTable("program_schedule", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
});

export const programExercises = pgTable("program_exercises", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").references(() => routines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sets: integer("sets"),
  reps: text("reps"),
  restTime: text("rest_time"),
  notes: text("notes"),
  orderInRoutine: integer("order_in_routine").notNull(),
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
  routineId: integer("routine_id").references(() => routines.id),
  data: jsonb("data").default('{}'),
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
  data: jsonb("data").default('{}'),
  date: timestamp("date").defaultNow(),
});

// Relations
export const programRelations = relations(programs, ({ one, many }) => ({
  coach: one(users, {
    fields: [programs.coachId],
    references: [users.id],
  }),
  routines: many(routines),
  clientPrograms: many(clientPrograms),
  schedule: many(programSchedule),
}));

export const routineRelations = relations(routines, ({ one, many }) => ({
  program: one(programs, {
    fields: [routines.programId],
    references: [programs.id],
  }),
  exercises: many(programExercises),
}));

export const programScheduleRelations = relations(programSchedule, ({ one }) => ({
  program: one(programs, {
    fields: [programSchedule.programId],
    references: [programs.id],
  }),
}));

export const programExerciseRelations = relations(programExercises, ({ one }) => ({
  routine: one(routines, {
    fields: [programExercises.routineId],
    references: [routines.id],
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

// Types
export type User = typeof users.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type ProgramSchedule = typeof programSchedule.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type ClientProgram = typeof clientPrograms.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type MealLog = typeof mealLogs.$inferSelect;

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const mealPlanSchema = z.object({
  mealName: z.string(),
  targetCalories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  notes: z.string(),
  foodSuggestions: z.array(z.string()),
});

export const posingDetailsSchema = z.object({
  bio: z.string(),
  details: z.string(),
  communicationPreference: z.enum(["email", "chat", "video"]),
});

export const programSchema = createSelectSchema(programs).extend({
  mealPlans: z.object({
    meals: z.array(mealPlanSchema),
  }).optional(),
  posingDetails: posingDetailsSchema.optional(),
});

export const insertProgramSchema = createInsertSchema(programs).extend({
  mealPlans: z.object({
    meals: z.array(mealPlanSchema),
  }).optional(),
  posingDetails: posingDetailsSchema.optional(),
});

export const betaSignups = pgTable("beta_signups", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BetaSignup = typeof betaSignups.$inferSelect;
export const insertBetaSignupSchema = createInsertSchema(betaSignups);
export const selectBetaSignupSchema = createSelectSchema(betaSignups);