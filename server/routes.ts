import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { programs, clientPrograms, workoutLogs, mealLogs, betaSignups, users, routines, programExercises } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Programs routes
  app.get("/api/programs", async (req, res) => {
    try {
      const allPrograms = await db.query.programs.findMany({
        with: {
          coach: true,
          routines: {
            with: {
              exercises: {
                orderBy: programExercises.orderInRoutine,
              },
            },
            orderBy: routines.orderInCycle,
          }
        }
      });
      res.json(allPrograms);
    } catch (error: any) {
      console.error("Error fetching programs:", error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/programs/:id", async (req, res) => {
    try {
      const startTime = performance.now();
      console.log(`[Performance] Starting DB query for program ${req.params.id} at ${startTime}ms`);

      // Fetch program with optimized query including program-specific data
      const [program] = await db.query.programs.findMany({
        where: eq(programs.id, parseInt(req.params.id)),
        with: {
          coach: {
            columns: {
              id: true,
              username: true,
              fullName: true,
              specialties: true,
            }
          },
          routines: {
            with: {
              exercises: {
                orderBy: programExercises.orderInRoutine,
                columns: {
                  id: true,
                  name: true,
                  description: true,
                  sets: true,
                  reps: true,
                  restTime: true,
                  notes: true,
                  orderInRoutine: true,
                }
              },
            },
            orderBy: routines.orderInCycle,
            columns: {
              id: true,
              name: true,
              dayOfWeek: true,
              notes: true,
              orderInCycle: true,
            }
          }
        },
        columns: {
          id: true,
          name: true,
          description: true,
          type: true,
          price: true,
          coachId: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          cycleLength: true,
          status: true,
          programData: true,
        },
        limit: 1,
      });

      const endTime = performance.now();
      console.log(`[Performance] DB query completed in ${endTime - startTime}ms`);

      if (!program) {
        return res.status(404).send("Program not found");
      }

      // Transform program data based on type
      const transformedProgram = {
        ...program,
        mealPlans: program.type === 'diet' ? program.programData?.mealPlans : undefined,
        posingDetails: program.type === 'posing' ? program.programData?.posingDetails : undefined,
      };

      res.json(transformedProgram);
    } catch (error: any) {
      console.error("Error fetching program:", error);
      res.status(500).send(error.message);
    }
  });

  // Update program with type-specific data
  app.put("/api/programs/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const programId = parseInt(req.params.id);
      const { routines: workoutDays, mealPlans, posingDetails, createdAt, updatedAt, ...programData } = req.body;

      // Prepare the program data based on type
      let typeSpecificData = {};
      if (programData.type === "diet" && mealPlans) {
        typeSpecificData = { mealPlans };
      } else if (programData.type === "posing" && posingDetails) {
        typeSpecificData = { posingDetails };
      }

      // Update program details
      const [updatedProgram] = await db
        .update(programs)
        .set({
          ...programData,
          updatedAt: new Date(),
          programData: typeSpecificData,
        })
        .where(eq(programs.id, programId))
        .returning();

      // Handle lifting program specific updates
      if (updatedProgram.type === "lifting" && workoutDays) {
        // Delete existing routines and exercises
        await db.delete(routines).where(eq(routines.programId, programId));

        // Create new routines and exercises
        for (const [dayIndex, day] of workoutDays.entries()) {
          const [routine] = await db.insert(routines)
            .values({
              programId,
              name: day.name,
              dayOfWeek: day.dayOfWeek,
              orderInCycle: dayIndex + 1,
              notes: day.notes,
            })
            .returning();

          if (day.exercises?.length > 0) {
            await db.insert(programExercises)
              .values(
                day.exercises.map((exercise: any, exerciseIndex: number) => ({
                  routineId: routine.id,
                  name: exercise.name,
                  description: exercise.description,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restTime: exercise.restTime,
                  notes: exercise.notes,
                  orderInRoutine: exerciseIndex + 1,
                }))
              );
          }
        }
      }

      // Fetch the updated program with all related data
      const [completeProgram] = await db.query.programs.findMany({
        where: eq(programs.id, programId),
        with: {
          routines: {
            with: {
              exercises: {
                orderBy: programExercises.orderInRoutine,
              },
            },
            orderBy: routines.orderInCycle,
          }
        },
        columns: {
          id: true,
          name: true,
          description: true,
          type: true,
          price: true,
          coachId: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          cycleLength: true,
          status: true,
          programData: true,
        },
        limit: 1,
      });

      // Transform response
      const transformedProgram = {
        ...completeProgram,
        mealPlans: completeProgram.type === 'diet' ? completeProgram.programData?.mealPlans : undefined,
        posingDetails: completeProgram.type === 'posing' ? completeProgram.programData?.posingDetails : undefined,
      };

      res.json(transformedProgram);
    } catch (error: any) {
      console.error("Error updating program:", error);
      res.status(500).send(error.message);
    }
  });

  app.post("/api/programs", async (req, res) => {
    if (!req.user?.accountType === "coach") {
      return res.status(403).send("Only coaches can create programs");
    }

    try {
      const { workoutDays, ...programData } = req.body;

      // Create program first
      const [program] = await db.insert(programs)
        .values({
          ...programData,
          coachId: req.user.id,
        })
        .returning();

      // Create routines and exercises for each workout day
      if (workoutDays?.length > 0) {
        for (const [dayIndex, day] of workoutDays.entries()) {
          // Create routine
          const [routine] = await db.insert(routines)
            .values({
              programId: program.id,
              name: day.name,
              dayOfWeek: day.dayOfWeek,
              orderInCycle: dayIndex + 1,
              notes: day.notes,
            })
            .returning();

          // Add exercises for this routine
          if (day.exercises?.length > 0) {
            await db.insert(programExercises)
              .values(
                day.exercises.map((exercise: any, exerciseIndex: number) => ({
                  ...exercise,
                  routineId: routine.id,
                  orderInRoutine: exerciseIndex + 1,
                }))
              );
          }
        }
      }

      // Fetch the complete program with all relations
      const [completeProgram] = await db.query.programs.findMany({
        where: eq(programs.id, program.id),
        with: {
          routines: {
            with: {
              exercises: {
                orderBy: programExercises.orderInRoutine,
              },
            },
            orderBy: routines.orderInCycle,
          }
        },
        limit: 1,
      });

      res.json(completeProgram);
    } catch (error: any) {
      console.error("Error creating program:", error);
      res.status(500).send(error.message);
    }
  });

  // Coach dashboard data
  app.get("/api/coach/dashboard", async (req, res) => {
    if (!req.user || req.user.accountType !== "coach") {
      return res.status(403).send("Only coaches can access this endpoint");
    }

    try {
      // Get all clients enrolled in this coach's programs
      const clientsData = await db.query.clientPrograms.findMany({
        where: eq(clientPrograms.programId, req.user.id),
        with: {
          client: true,
          program: true
        }
      });

      // Get workout and meal logs for each client
      const clientProgress = await Promise.all(
        clientsData.map(async ({ client }) => {
          const [workouts, lastActive] = await Promise.all([
            db.query.workoutLogs.findMany({
              where: eq(workoutLogs.clientId, client.id),
              orderBy: [desc(workoutLogs.date)],
              limit: 1
            }),
            db.query.workoutLogs.findMany({
              where: eq(workoutLogs.clientId, client.id),
              orderBy: [desc(workoutLogs.date)],
              limit: 1
            })
          ]);

          return {
            id: client.id,
            username: client.username,
            progress: {
              totalWorkouts: workouts.length,
              lastActive: lastActive[0]?.date || new Date().toISOString(),
              programCompletion: 0 // To be calculated based on program structure
            }
          };
        })
      );

      res.json({
        clients: clientProgress,
        stats: {
          totalClients: clientProgress.length,
          activePrograms: clientsData.length,
          messageCount: 0 // To be implemented with messaging system
        }
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Client dashboard data
  app.get("/api/client/dashboard", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [workouts, meals] = await Promise.all([
        db.query.workoutLogs.findMany({
          where: eq(workoutLogs.clientId, req.user.id),
          orderBy: [desc(workoutLogs.date)],
          limit: 10
        }),
        db.query.mealLogs.findMany({
          where: eq(mealLogs.clientId, req.user.id),
          orderBy: [desc(mealLogs.date)],
          limit: 10
        })
      ]);

      const stats = {
        totalWorkouts: workouts.length,
        averageCalories: meals.reduce((acc, meal) => acc + (meal.calories || 0), 0) / (meals.length || 1),
        programProgress: 0 // To be calculated based on program structure
      };

      res.json({
        workouts,
        meals,
        stats
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Beta signup endpoint
  app.post("/api/beta-signup", async (req, res) => {
    try {
      const { fullName, email } = req.body;

      if (!fullName || !email) {
        return res.status(400).send("Full name and email are required");
      }

      const signup = await db.insert(betaSignups)
        .values({
          fullName,
          email,
        })
        .returning();

      res.json({
        message: "Beta signup successful",
        signup: signup[0],
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });


  // Get client's enrolled programs
  app.get("/api/client/programs", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const enrolledPrograms = await db.query.clientPrograms.findMany({
        where: eq(clientPrograms.clientId, req.user.id),
        with: {
          program: {
            with: {
              routines: {
                with: {
                  exercises: {
                    orderBy: programExercises.orderInRoutine,
                  },
                },
                orderBy: routines.orderInCycle,
              }
            }
          },
        },
      });

      if (!enrolledPrograms.length) {
        return res.json([]);
      }

      // Transform the response to include client-specific data
      const transformedPrograms = enrolledPrograms.map(enrollment => {
        const program = enrollment.program;
        return {
          id: enrollment.id,
          programId: program.id,
          name: enrollment.clientProgramData?.customizations?.name || program.name,
          description: program.description,
          type: program.type,
          startDate: enrollment.startDate,
          active: enrollment.active,
          version: enrollment.version,
          routines: enrollment.clientProgramData?.customizations?.routines || program.routines,
          mealPlans: program.type === 'diet' ? 
            enrollment.clientProgramData?.customizations?.mealPlans || program.programData?.mealPlans : 
            undefined,
          posingDetails: program.type === 'posing' ? 
            enrollment.clientProgramData?.customizations?.posingDetails || program.programData?.posingDetails : 
            undefined,
          progress: enrollment.clientProgramData?.progress || { completed: [], notes: [] },
        };
      });

      res.json(transformedPrograms);
    } catch (error: any) {
      console.error("Error fetching enrolled programs:", error);
      res.status(500).json({
        error: "Failed to fetch enrolled programs",
        details: error.message
      });
    }
  });

  // Enhanced program enrollment with program copy
  app.post("/api/programs/:id/enroll", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const programId = parseInt(req.params.id);

      // Check if already enrolled
      const existingEnrollment = await db.query.clientPrograms.findFirst({
        where: and(
          eq(clientPrograms.clientId, req.user.id),
          eq(clientPrograms.programId, programId),
          eq(clientPrograms.active, true)
        ),
      });

      if (existingEnrollment) {
        return res.status(400).json({
          error: "Already enrolled",
          message: "You are already enrolled in this program"
        });
      }

      // Fetch the original program with all its data
      const [program] = await db.query.programs.findMany({
        where: eq(programs.id, programId),
        with: {
          routines: {
            with: {
              exercises: {
                orderBy: programExercises.orderInRoutine,
              },
            },
            orderBy: routines.orderInCycle,
          }
        },
        limit: 1,
      });

      if (!program) {
        return res.status(404).json({
          error: "Program not found",
          message: "The requested program does not exist"
        });
      }

      // Create client-specific program data
      const clientProgramData = {
        customizations: {
          name: program.name,
          routines: program.routines,
          ...(program.type === "diet" && { mealPlans: program.programData?.mealPlans }),
          ...(program.type === "posing" && { posingDetails: program.programData?.posingDetails }),
        },
        progress: {
          completed: [],
          notes: [],
        },
      };

      // Create the enrollment with the copied data
      const [enrollment] = await db.insert(clientPrograms)
        .values({
          clientId: req.user.id,
          programId: program.id,
          clientProgramData: clientProgramData,
          active: true,
          version: 1,
        })
        .returning();

      // Return the transformed program data
      const transformedEnrollment = {
        id: enrollment.id,
        programId: program.id,
        name: program.name,
        description: program.description,
        type: program.type,
        startDate: enrollment.startDate,
        active: enrollment.active,
        version: enrollment.version,
        routines: program.routines,
        mealPlans: program.type === 'diet' ? program.programData?.mealPlans : undefined,
        posingDetails: program.type === 'posing' ? program.programData?.posingDetails : undefined,
        progress: { completed: [], notes: [] },
      };

      res.json(transformedEnrollment);
    } catch (error: any) {
      console.error("Error enrolling in program:", error);
      res.status(500).json({
        error: "Enrollment failed",
        details: error.message
      });
    }
  });

  // Update client-specific program
  app.put("/api/client/programs/:enrollmentId", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const enrollmentId = parseInt(req.params.enrollmentId);
      const { customizations, progress } = req.body;

      // Verify ownership
      const [existing] = await db.select()
        .from(clientPrograms)
        .where(and(
          eq(clientPrograms.id, enrollmentId),
          eq(clientPrograms.clientId, req.user.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).send("Enrolled program not found");
      }

      // Update client-specific program data
      const [updated] = await db.update(clientPrograms)
        .set({
          clientProgramData: {
            customizations,
            progress,
          },
          lastModified: new Date(),
          version: existing.version + 1,
        })
        .where(eq(clientPrograms.id, enrollmentId))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating client program:", error);
      res.status(500).send(error.message);
    }
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

  // Enhanced progress data with analytics
  app.get("/api/progress", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const [workouts, meals, workoutStats, nutritionStats] = await Promise.all([
      // Recent workouts
      db.query.workoutLogs.findMany({
        where: eq(workoutLogs.clientId, req.user.id),
        orderBy: (workoutLogs, { desc }) => [desc(workoutLogs.date)],
        limit: 10
      }),
      // Recent meals
      db.query.mealLogs.findMany({
        where: eq(mealLogs.clientId, req.user.id),
        orderBy: (mealLogs, { desc }) => [desc(mealLogs.date)],
        limit: 10
      }),
      // Workout statistics
      db.query.workoutLogs.findMany({
        where: eq(workoutLogs.clientId, req.user.id),
        orderBy: (workoutLogs, { desc }) => [desc(workoutLogs.date)],
        limit: 30 // Last 30 workouts for trends
      }),
      // Nutrition statistics
      db.query.mealLogs.findMany({
        where: eq(mealLogs.clientId, req.user.id),
        orderBy: (mealLogs, { desc }) => [desc(mealLogs.date)],
        limit: 30 // Last 30 days of nutrition data
      })
    ]);

    // Calculate averages and trends
    const workoutTrends = {
      totalWorkouts: workoutStats.length,
      averageVolume: workoutStats.reduce((acc, w) => acc + (w.data?.volume || 0), 0) / workoutStats.length || 0,
      lastWeekVolume: workoutStats.slice(0, 7).reduce((acc, w) => acc + (w.data?.volume || 0), 0),
    };

    const nutritionTrends = {
      averageCalories: meals.reduce((acc, m) => acc + (m.calories || 0), 0) / meals.length || 0,
      averageProtein: meals.reduce((acc, m) => acc + (m.protein || 0), 0) / meals.length || 0,
      caloriesTrend: nutritionStats.map(m => ({
        date: m.date,
        calories: m.calories,
      })),
    };

    res.json({
      workouts,
      meals,
      analytics: {
        workout: workoutTrends,
        nutrition: nutritionTrends,
      }
    });
  });

  app.get("/api/profile", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [profile] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      res.json(profile);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/profile", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [updatedProfile] = await db
        .update(users)
        .set({
          ...req.body,
          socialLinks: req.body.socialLinks ? JSON.parse(req.body.socialLinks) : undefined,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json(updatedProfile);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}