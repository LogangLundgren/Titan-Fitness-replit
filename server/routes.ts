import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { programs, clientPrograms, workoutLogs, mealLogs } from "@db/schema";
import { eq, and } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Programs routes
  app.get("/api/programs", async (req, res) => {
    const allPrograms = await db.query.programs.findMany({
      with: {
        coach: true
      }
    });
    res.json(allPrograms);
  });

  app.post("/api/programs", async (req, res) => {
    if (!req.user || req.user.accountType !== "coach") {
      return res.status(403).send("Only coaches can create programs");
    }

    const program = await db.insert(programs)
      .values({
        ...req.body,
        coachId: req.user.id
      })
      .returning();

    res.json(program[0]);
  });

  // Client program enrollment
  app.post("/api/programs/:id/enroll", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const enrollment = await db.insert(clientPrograms)
      .values({
        clientId: req.user.id,
        programId: parseInt(req.params.id),
      })
      .returning();

    res.json(enrollment[0]);
  });

  // Workout logging
  app.post("/api/workouts", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const log = await db.insert(workoutLogs)
      .values({
        clientId: req.user.id,
        ...req.body
      })
      .returning();

    res.json(log[0]);
  });

  // Meal logging
  app.post("/api/meals", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const log = await db.insert(mealLogs)
      .values({
        clientId: req.user.id,
        ...req.body
      })
      .returning();

    res.json(log[0]);
  });

  // Get user's progress data
  app.get("/api/progress", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const [workouts, meals] = await Promise.all([
      db.query.workoutLogs.findMany({
        where: eq(workoutLogs.clientId, req.user.id),
        orderBy: (workoutLogs, { desc }) => [desc(workoutLogs.date)],
        limit: 10
      }),
      db.query.mealLogs.findMany({
        where: eq(mealLogs.clientId, req.user.id),
        orderBy: (mealLogs, { desc }) => [desc(mealLogs.date)],
        limit: 10
      })
    ]);

    res.json({ workouts, meals });
  });

  const httpServer = createServer(app);
  return httpServer;
}
