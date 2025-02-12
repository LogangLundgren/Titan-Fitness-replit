import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Refined schema for program exercise data
const exerciseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  sets: z.number(),
  reps: z.string(),
  restTime: z.string().optional(),
  notes: z.string().optional(),
  orderInRoutine: z.number(),
});

const routineSchema = z.object({
  id: z.number(),
  name: z.string(),
  dayOfWeek: z.number().optional(),
  orderInCycle: z.number(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema),
});

// Base users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  accountType: text("account_type", { enum: ['client', 'coach'] }).notNull().default('client'),
  fullName: text("full_name"),
  phoneNumber: text("phone_number"),
  bio: text("bio"),
  experience: text("experience"),
  certifications: text("certifications"),
  specialties: text("specialties"),
  socialLinks: jsonb("social_links").default('{}'),
  isPublicProfile: boolean("is_public_profile").default(true),
  profilePictureUrl: text("profile_picture_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coaches table
export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  bio: text("bio"),
  experience: text("experience"),
  certifications: text("certifications"),
  specialties: text("specialties"),
  socialLinks: jsonb("social_links").default('{}'),
  isPublicProfile: boolean("is_public_profile").default(true),
  profilePictureUrl: text("profile_picture_url"),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  bio: text("bio"),
  height: text("height"),
  weight: text("weight"),
  fitnessGoals: text("fitness_goals"),
  medicalConditions: text("medical_conditions"),
  dietaryRestrictions: text("dietary_restrictions"),
  profilePictureUrl: text("profile_picture_url"),
  isPublicProfile: boolean("is_public_profile").default(true),
  socialLinks: jsonb("social_links").default('{}'),
});

// Programs table with improved data structure
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ['lifting', 'diet', 'posing'] }).notNull(),
  price: real("price").default(0),
  coachId: integer("coach_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isPublic: boolean("is_public").default(false),
  programData: jsonb("program_data").default('{}'),
  status: text("status", { enum: ['draft', 'active', 'archived'] }).default('draft'),
  cycleLength: integer("cycle_length"),
});

// Routines table
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dayOfWeek: integer("day_of_week"),
  orderInCycle: integer("order_in_cycle"),
  notes: text("notes"),
});

// Program Exercises table
export const programExercises = pgTable("program_exercises", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  routineId: integer("routine_id").references(() => routines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sets: integer("sets"),
  reps: text("reps"),
  restTime: text("rest_time"),
  notes: text("notes"),
  orderInRoutine: integer("order_in_routine").notNull(),
});

// Client Programs table
export const clientPrograms = pgTable("client_programs", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  programId: integer("program_id").references(() => programs.id),
  active: boolean("active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  completedWorkouts: integer("completed_workouts").default(0),
  clientProgramData: jsonb("client_program_data").default('{}'),
  lastModified: timestamp("last_modified").defaultNow(),
  version: integer("version").default(1),
});

// Workout Logs table
export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  clientProgramId: integer("client_program_id").references(() => clientPrograms.id),
  routineId: integer("routine_id").references(() => routines.id),
  data: jsonb("data").default('{}'),
  date: timestamp("date").defaultNow(),
});

// Meal Logs table
export const mealLogs = pgTable("meal_logs", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  clientProgramId: integer("client_program_id").references(() => clientPrograms.id),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fats: integer("fats"),
  data: jsonb("data").default('{}'),
  date: timestamp("date").defaultNow(),
});

// Beta Signups table
export const betaSignups = pgTable("beta_signups", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for type validation
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

export const programDataSchema = z.object({
  mealPlans: z.array(mealPlanSchema).optional(),
  posingDetails: posingDetailsSchema.optional(),
  routines: z.array(routineSchema).optional(),
});

export const clientProgramDataSchema = z.object({
  customizations: z.object({
    name: z.string().optional(),
    notes: z.string().optional(),
    routines: z.array(routineSchema).optional(),
    mealPlans: z.array(mealPlanSchema).optional(),
    posingDetails: posingDetailsSchema.optional(),
  }).optional(),
  progress: z.object({
    completed: z.array(z.string()),
    notes: z.array(z.object({
      date: z.string(),
      routineId: z.number(),
      note: z.string(),
    })),
    lastWorkout: z.string().optional(),
    streak: z.number().default(0),
  }).default({
    completed: [],
    notes: [],
    streak: 0
  }),
});

// Export types with improved type safety
export type User = typeof users.$inferSelect;
export type Coach = typeof coaches.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Program = typeof programs.$inferSelect & {
  programData: z.infer<typeof programDataSchema>;
};
export type Routine = typeof routines.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type ClientProgram = typeof clientPrograms.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type MealLog = typeof mealLogs.$inferSelect;
export type BetaSignup = typeof betaSignups.$inferSelect;
export type ClientProgramData = z.infer<typeof clientProgramDataSchema>;


// Relations
export const userRelations = relations(users, ({ many }) => ({
  programs: many(programs),
  coachProfile: many(coaches),
  clientProfile: many(clients),
}));

export const coachRelations = relations(coaches, ({ one }) => ({
  user: one(users, {
    fields: [coaches.userId],
    references: [users.id],
  }),
}));

export const clientRelations = relations(clients, ({ one }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
}));

export const programRelations = relations(programs, ({ one, many }) => ({
  coach: one(users, {
    fields: [programs.coachId],
    references: [users.id],
  }),
  routines: many(routines),
  clientPrograms: many(clientPrograms),
}));

export const routineRelations = relations(routines, ({ one, many }) => ({
  program: one(programs, {
    fields: [routines.programId],
    references: [programs.id],
  }),
  exercises: many(programExercises),
}));

export const programExerciseRelations = relations(programExercises, ({ one }) => ({
  routine: one(routines, {
    fields: [programExercises.routineId],
    references: [routines.id],
  }),
}));

export const clientProgramRelations = relations(clientPrograms, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientPrograms.clientId],
    references: [clients.id],
  }),
  program: one(programs, {
    fields: [clientPrograms.programId],
    references: [programs.id],
  }),
  workoutLogs: many(workoutLogs),
  mealLogs: many(mealLogs),
}));

// Create Zod schemas for insertion and selection
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertCoachSchema = createInsertSchema(coaches);
export const selectCoachSchema = createSelectSchema(coaches);

export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);

export const insertProgramSchema = createInsertSchema(programs);
export const selectProgramSchema = createSelectSchema(programs);

export const insertBetaSignupSchema = createInsertSchema(betaSignups);
export const selectBetaSignupSchema = createSelectSchema(betaSignups);