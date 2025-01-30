import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { programs, clientPrograms, workoutLogs, mealLogs, betaSignups, users, routines, programExercises } from "@db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Get client's enrolled programs
  app.get("/api/client/programs/:id?", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // If ID is provided, fetch specific program
      if (req.params.id) {
        const enrollmentId = parseInt(req.params.id);
        console.log(`[Debug] Fetching program for enrollment ID: ${enrollmentId}`);

        const [enrollment] = await db.query.clientPrograms.findMany({
          where: and(
            eq(clientPrograms.id, enrollmentId),
            eq(clientPrograms.clientId, req.user.id)
          ),
          with: {
            program: {
              with: {
                routines: {
                  with: {
                    exercises: {
                      columns: {
                        id: true,
                        name: true,
                        description: true,
                        sets: true,
                        reps: true,
                        restTime: true,
                        notes: true,
                        orderInRoutine: true,
                      },
                      orderBy: programExercises.orderInRoutine,
                    },
                  },
                  columns: {
                    id: true,
                    name: true,
                    dayOfWeek: true,
                    notes: true,
                    orderInCycle: true,
                  },
                  orderBy: routines.orderInCycle,
                }
              }
            },
          },
          limit: 1,
        });

        console.log(`[Debug] Found enrollment:`, enrollment);
        console.log(`[Debug] Program:`, enrollment?.program);
        console.log(`[Debug] Routines:`, enrollment?.program?.routines);

        if (!enrollment) {
          return res.status(404).json({
            error: "Program not found",
            message: "The requested program does not exist or you don't have access to it"
          });
        }

        // Transform the response to include client-specific data
        const program = enrollment.program;
        const transformedProgram = {
          enrollmentId: enrollment.id,
          programId: program.id,
          name: program.name,
          description: program.description,
          type: program.type,
          startDate: enrollment.startDate,
          active: enrollment.active,
          version: enrollment.version,
          routines: program.routines,
          progress: enrollment.clientProgramData?.progress || { completed: [], notes: [] },
        };

        return res.json(transformedProgram);
      }

      // Otherwise, fetch all enrolled programs
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

      const transformedPrograms = enrolledPrograms.map(enrollment => {
        const program = enrollment.program;
        return {
          enrollmentId: enrollment.id,
          programId: program.id,
          name: enrollment.clientProgramData?.customizations?.name || program.name,
          description: program.description,
          type: program.type,
          startDate: enrollment.startDate,
          active: enrollment.active,
          version: enrollment.version,
          routines: enrollment.clientProgramData?.customizations?.routines || program.routines,
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
      const { firstName, lastName, email } = req.body;

      if (!firstName || !lastName || !email) {
        return res.status(400).send("First name, last name, and email are required");
      }

      const signup = await db.insert(betaSignups)
        .values({
          firstName,
          lastName,
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


  // Workout logging
  app.post("/api/workouts", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { clientProgramId, routineId, data } = req.body;

      // Verify the client has access to this program
      const [enrollment] = await db.query.clientPrograms.findMany({
        where: and(
          eq(clientPrograms.programId, clientProgramId),
          eq(clientPrograms.clientId, req.user.id)
        ),
        limit: 1,
      });

      if (!enrollment) {
        return res.status(404).send("Program enrollment not found");
      }

      // Create workout log
      const [log] = await db.insert(workoutLogs)
        .values({
          clientId: req.user.id,
          clientProgramId,
          routineId,
          data,
          date: new Date(),
        })
        .returning();

      // Update client program progress
      const progress = enrollment.clientProgramData?.progress || { completed: [], notes: [] };
      progress.completed = [...new Set([...progress.completed, routineId.toString()])];

      if (data.notes) {
        progress.notes = [...(progress.notes || []), {
          date: new Date().toISOString(),
          routineId,
          note: data.notes,
        }];
      }

      await db.update(clientPrograms)
        .set({
          clientProgramData: {
            ...enrollment.clientProgramData,
            progress,
          },
          lastModified: new Date(),
        })
        .where(eq(clientPrograms.id, enrollment.id));

      res.json(log);
    } catch (error: any) {
      console.error("Error logging workout:", error);
      res.status(500).send(error.message);
    }
  });

  // Add meal logging endpoints after the workout logging endpoint
  // Meal logging
  app.post("/api/meals", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { clientProgramId, data } = req.body;

      // Verify the client has access to this program
      const [enrollment] = await db.query.clientPrograms.findMany({
        where: and(
          eq(clientPrograms.id, clientProgramId),
          eq(clientPrograms.clientId, req.user.id)
        ),
        limit: 1,
      });

      if (!enrollment) {
        return res.status(404).send("Program enrollment not found");
      }

      // Create meal log
      const [log] = await db.insert(mealLogs)
        .values({
          clientId: req.user.id,
          clientProgramId,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          data: data.data,
          date: new Date(),
        })
        .returning();

      res.json(log);
    } catch (error: any) {
      console.error("Error logging meal:", error);
      res.status(500).send(error.message);
    }
  });

  // Get meal logs
  app.get("/api/meals", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const logs = await db.query.mealLogs.findMany({
        where: eq(mealLogs.clientId, req.user.id),
        orderBy: [desc(mealLogs.date)],
      });

      res.json(logs);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Delete meal log endpoint
  app.delete("/api/meals/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // First verify the meal log belongs to this user
      const [mealLog] = await db.query.mealLogs.findMany({
        where: and(
          eq(mealLogs.id, parseInt(req.params.id)),
          eq(mealLogs.clientId, req.user.id)
        ),
        limit: 1
      });

      if (!mealLog) {
        return res.status(404).json({
          error: "Meal log not found",
          message: "The requested meal log does not exist or you don't have access to it"
        });
      }

      // Delete the meal log
      await db.delete(mealLogs)
        .where(and(
          eq(mealLogs.id, parseInt(req.params.id)),
          eq(mealLogs.clientId, req.user.id)
        ));

      res.json({ message: "Meal log deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting meal log:", error);
      res.status(500).send(error.message);
    }
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

  // Get workout history for a specific program
  app.get("/api/workouts/:programId", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      console.log(`[Debug] Fetching workout history for program ${req.params.programId} and user ${req.user.id}`);

      // First get the routine information for this program
      const [program] = await db.query.programs.findMany({
        where: eq(programs.id, parseInt(req.params.programId)),
        with: {
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
            columns: {
              id: true,
              name: true,
              dayOfWeek: true,
              notes: true,
              orderInCycle: true,
            }
          }
        },
        limit: 1
      });

      console.log(`[Debug] Found program:`, program);
      console.log(`[Debug] Routines:`, program?.routines);

      // Create maps for quick lookups
      const routineMap = program?.routines.reduce((acc, routine) => {
        acc[routine.id] = routine;
        return acc;
      }, {} as Record<number, any>);

      const logs = await db.query.workoutLogs.findMany({
        where: and(
          eq(workoutLogs.clientProgramId, parseInt(req.params.programId)),
          eq(workoutLogs.clientId, req.user.id)
        ),
        orderBy: [desc(workoutLogs.date)],
        columns: {
          id: true,
          date: true,
          routineId: true,
          data: true,
        },
      });

      console.log(`[Debug] Found ${logs.length} workout logs`);
      console.log('[Debug] Sample log:', logs[0]);

      const formattedLogs = logs.map(log => {
        const routine = routineMap[log.routineId];
        const exerciseMap = routine?.exercises.reduce((acc: Record<number, any>, ex: any) => {
          acc[ex.id] = ex;
          return acc;
        }, {});

        return {
          id: log.id,
          date: log.date,
          routineId: log.routineId,
          routineName: routine?.name || 'Unknown Routine',
          exercises: log.data?.exerciseLogs?.map((ex: any) => {
            const programExercise = exerciseMap[ex.exerciseId];
            return {
              name: programExercise?.name || 'Unknown Exercise',
              sets: ex.sets.map((set: any) => ({
                weight: parseInt(set.weight || '0'),
                reps: parseInt(set.reps || '0')
              }))
            };
          }) || [],
          notes: log.data?.notes
        };
      });

      console.log('[Debug] First formatted log:', formattedLogs[0]);
      res.json(formattedLogs);
    } catch (error: any) {
      console.error("Error fetching workout history:", error);
      res.status(500).send(error.message);
    }
  });

  // Add delete workout log endpoint
  app.delete("/api/workouts/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // First verify the workout log belongs to this user
      const [workoutLog] = await db.query.workoutLogs.findMany({
        where: and(
          eq(workoutLogs.id, parseInt(req.params.id)),
          eq(workoutLogs.clientId, req.user.id)
        ),
        limit: 1
      });

      if (!workoutLog) {
        return res.status(404).json({
          error: "Workout log not found",
          message: "The requested workout log does not exist or you don't have access to it"
        });
      }

      // Delete the workout log
      await db.delete(workoutLogs)
        .where(and(
          eq(workoutLogs.id, parseInt(req.params.id)),
          eq(workoutLogs.clientId, req.user.id)
        ));

      res.json({ message: "Workout log deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting workout log:", error);
      res.status(500).send(error.message);
    }
  });

  // Get meal history for a specific program
  app.get("/api/meals/:programId", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      console.log(`[Debug] Fetching meal history for program ${req.params.programId} and user ${req.user.id}`);

      const logs = await db.query.mealLogs.findMany({
        where: and(
          eq(mealLogs.clientProgramId, parseInt(req.params.programId)),
          eq(mealLogs.clientId, req.user.id)
        ),
        orderBy: [desc(mealLogs.date)]
      });

      console.log(`[Debug] Found ${logs.length} meal logs`);
      console.log('[Debug] Sample log:', logs[0]);

      const formattedLogs = logs.map(log => ({
        id: log.id,
        date: log.date,
        calories: log.calories || 0,
        protein: log.protein || 0,
        carbs: log.carbs || 0,
        fats: log.fat || 0,
        notes: log.data?.notes,
        data: log.data
      }));

      console.log('[Debug] First formatted log:', formattedLogs[0]);
      res.json(formattedLogs);
    } catch (error: any) {
      console.error("Error fetching meal history:", error);
      res.status(500).send(error.message);
    }
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

  // Delete program endpoint
  app.delete("/api/programs/:id", async (req, res) => {
    if (!req.user?.accountType === "coach") {
      return res.status(403).send("Only coaches can delete programs");
    }

    try {
      const programId = parseInt(req.params.id);

      // Check if the program exists and belongs to this coach
      const [program] = await db.query.programs.findMany({
        where: and(
          eq(programs.id, programId),
          eq(programs.coachId, req.user.id)
        ),
        limit: 1
      });

      if (!program) {
        return res.status(404).send("Program not found or you don't have permission to delete it");
      }

      // Delete program and all related data
      await db.transaction(async (tx) => {
        // Delete program exercises
        await tx
          .delete(programExercises)
          .where(
            inArray(
              programExercises.routineId,
              db.select({ id: routines.id })
                .from(routines)
                .where(eq(routines.programId, programId))
            )
          );

        // Delete routines
        await tx
          .delete(routines)
          .where(eq(routines.programId, programId));

        // Delete client enrollments
        await tx
          .delete(clientPrograms)
          .where(eq(clientPrograms.programId, programId));

        // Finally delete the program
        await tx
          .delete(programs)
          .where(eq(programs.id, programId));
      });

      res.json({ message: "Program deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting program:", error);
      res.status(500).send(error.message);
    }
  });

  // Enhanced program enrollment with program copy
  app.post("/api/programs/:id/enroll", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {      const programId = parseInt(req.params.id);

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

      // Create the enrollment with the copied data
      const [enrollment] = await db.insert(clientPrograms)
        .values({
          clientId: req.user.id,
          programId: program.id,
          startDate: new Date(),
          active: true,
          version: 1,
          clientProgramData: {
            progress: { completed: [], notes: [] }
          }
        })
        .returning();

      // Return the transformed program data
      const transformedEnrollment = {
        enrollmentId: enrollment.id,
        programId: program.id,
        name: program.name,
        description: program.description,
        type: program.type,
        startDate: enrollment.startDate,
        active: enrollment.active,
        version: enrollment.version,
        routines: program.routines || [],
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

  const httpServer = createServer(app);
  return httpServer;
}