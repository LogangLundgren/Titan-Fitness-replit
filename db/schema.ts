import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Base users table - keeping existing columns while adding new ones
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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

// New coaches table
export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  bio: text("bio"),
  experience: text("experience"),
  certifications: text("certifications"),
  specialties: text("specialties"),
  socialLinks: jsonb("social_links").default('{}'),
  isPublicProfile: boolean("is_public_profile").default(true),
  profilePictureUrl: text("profile_picture_url"),
});

// New clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  bio: text("bio"),
  height: text("height"),
  weight: text("weight"),
  fitnessGoals: text("fitness_goals"),
  medicalConditions: text("medical_conditions"),
  dietaryRestrictions: text("dietary_restrictions"),
  profilePictureUrl: text("profile_picture_url"),
});

// Keeping existing foreign key references to users table temporarily
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  price: real("price").default(0),
  coachId: integer("coach_id").references(() => users.id), // Keeping reference to users for now
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isPublic: boolean("is_public").default(false),
  programData: jsonb("program_data").default('{}'),
  status: text("status"),
  cycleLength: integer("cycle_length"),
});

// Relations definitions
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
    references: [users.id],  // Fix the reference to point to users.id instead of clients.id
  }),
}));

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dayOfWeek: integer("day_of_week"),
  orderInCycle: integer("order_in_cycle"),
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
  clientId: integer("client_id").references(() => clients.id),
  programId: integer("program_id").references(() => programs.id),
  active: boolean("active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  completedWorkouts: integer("completed_workouts").default(0),
  clientProgramData: jsonb("client_program_data").default('{}'),
  lastModified: timestamp("last_modified").defaultNow(),
  version: integer("version").default(1),
});

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  clientProgramId: integer("client_program_id").references(() => clientPrograms.id),
  routineId: integer("routine_id").references(() => routines.id),
  data: jsonb("data").default('{}'),
  date: timestamp("date").defaultNow(),
});

export const mealLogs = pgTable("meal_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  clientProgramId: integer("client_program_id").references(() => clientPrograms.id),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fats: integer("fats"),
  data: jsonb("data").default('{}'),
  date: timestamp("date").defaultNow(),
});

export const betaSignups = pgTable("beta_signups", {
  id: serial("id").primaryKey(),
  firstName: text("first_name"),  // Making nullable initially
  lastName: text("last_name"),    // Making nullable initially
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const programRelations = relations(programs, ({ one, many }) => ({
  coach: one(coaches, {
    fields: [programs.coachId],
    references: [coaches.id],
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

export const workoutLogRelations = relations(workoutLogs, ({ one }) => ({
  clientProgram: one(clientPrograms, {
    fields: [workoutLogs.clientProgramId],
    references: [clientPrograms.id],
  }),
  client: one(clients, {
    fields: [workoutLogs.clientId],
    references: [clients.id],
  }),
  routine: one(routines, {
    fields: [workoutLogs.routineId],
    references: [routines.id],
  }),
}));

export const mealLogRelations = relations(mealLogs, ({ one }) => ({
  clientProgram: one(clientPrograms, {
    fields: [mealLogs.clientProgramId],
    references: [clientPrograms.id],
  }),
  client: one(clients, {
    fields: [mealLogs.clientId],
    references: [clients.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Coach = typeof coaches.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type ClientProgram = typeof clientPrograms.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type MealLog = typeof mealLogs.$inferSelect;
export type BetaSignup = typeof betaSignups.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertCoachSchema = createInsertSchema(coaches);
export const selectCoachSchema = createSelectSchema(coaches);

export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);

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
});

export const programSchema = createSelectSchema(programs);
export const insertProgramSchema = createInsertSchema(programs);

export const insertBetaSignupSchema = createInsertSchema(betaSignups);
export const selectBetaSignupSchema = createSelectSchema(betaSignups);

export const clientProgramDataSchema = z.object({
  customizations: z.object({
    name: z.string().optional(),
    notes: z.string().optional(),
    routines: z.array(z.any()).optional(),
    mealPlans: z.array(mealPlanSchema).optional(),
    posingDetails: posingDetailsSchema.optional(),
  }).optional(),
  progress: z.object({
    completed: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
  }).optional(),
});

export type ClientProgramData = z.infer<typeof clientProgramDataSchema>;