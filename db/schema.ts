import { pgTable, text, serial, integer, boolean, timestamp, json, real, jsonb } from "drizzle-orm/pg-core";
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
  socialLinks: jsonb("social_links").$type<{
    instagram?: string;
    twitter?: string;
    website?: string;
  }>().default('{}'),
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
  cycleLength: integer("cycle_length"), // Number of days in the program cycle, can be null for flexible schedules
  status: text("status").default("active"), // active, archived, draft
});

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dayOfWeek: integer("day_of_week"), // Can be null for flexible schedules
  orderInCycle: integer("order_in_cycle"), // Can be null for flexible schedules
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
  data: jsonb("data").$type<{
    exercises: Array<{
      exerciseId: number;
      sets: Array<{
        weight: number;
        reps: number;
        notes?: string;
      }>;
    }>;
  }>(),
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

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertProgramSchema = createInsertSchema(programs);
export const selectProgramSchema = createSelectSchema(programs);

export const betaSignups = pgTable("beta_signups", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BetaSignup = typeof betaSignups.$inferSelect;
export const insertBetaSignupSchema = createInsertSchema(betaSignups);
export const selectBetaSignupSchema = createSelectSchema(betaSignups);