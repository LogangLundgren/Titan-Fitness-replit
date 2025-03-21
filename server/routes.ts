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

      // Start a transaction
      const result = await db.transaction(async (tx) => {
        // Prepare the program data based on type
        let typeSpecificData = {};
        if (programData.type === "diet" && mealPlans) {
          typeSpecificData = { mealPlans };
        } else if (programData.type === "posing" && posingDetails) {
          typeSpecificData = { posingDetails };
        }

        // Update program details
        const [updatedProgram] = await tx
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
          // Delete existing routines (cascades to exercises due to foreign key)
          await tx.delete(routines).where(eq(routines.programId, programId));

          // Create new routines and exercises
          for (const [dayIndex, day] of workoutDays.entries()) {
            const [routine] = await tx.insert(routines)
              .values({
                programId,
                name: day.name,
                dayOfWeek: day.dayOfWeek,
                orderInCycle: dayIndex + 1,
                notes: day.notes,
              })
              .returning();

            if (day.exercises?.length > 0) {
              await tx.insert(programExercises)
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
        const [completeProgram] = await tx.query.programs.findMany({
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

        return completeProgram;
      });

      // Transform response
      const transformedProgram = {
        ...result,
        mealPlans: result.type === 'diet' ? result.programData?.mealPlans : undefined,
        posingDetails: result.type === 'posing' ? result.programData?.posingDetails : undefined,
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

  // Fixed coach dashboard route with better client name handling
  app.get("/api/coach/dashboard", async (req, res) => {
    if (!req.user || req.user.accountType !== "coach") {
      return res.status(403).json({
        error: "Access denied",
        message: "Only coaches can access this endpoint"
      });
    }

    try {
      // First get all programs created by this coach with their client enrollments
      const coachPrograms = await db.query.programs.findMany({
        where: eq(programs.coachId, req.user.id),
        with: {
          clientPrograms: {
            where: eq(clientPrograms.active, true),
            with: {
              client: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      fullName: true,
                      email: true,
                      username: true, // Added username as fallback
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Extract all client program IDs for log queries
      const clientProgramIds = coachPrograms
        .flatMap(p => p.clientPrograms)
        .map(cp => cp.id);

      if (clientProgramIds.length === 0) {
        return res.json({
          clients: [],
          stats: { totalClients: 0, activePrograms: 0, totalWorkouts: 0 },
          programTypes: { lifting: 0, diet: 0, posing: 0, 'all-inclusive': 0 }
        });
      }

      // Fetch all workout logs first
      const allWorkoutLogs = await db.query.workoutLogs.findMany({
        where: inArray(workoutLogs.clientProgramId, clientProgramIds),
        orderBy: [desc(workoutLogs.date)],
      });

      // Then fetch all meal logs
      const allMealLogs = await db.query.mealLogs.findMany({
        where: inArray(mealLogs.clientProgramId, clientProgramIds),
        orderBy: [desc(mealLogs.date)],
      });

      // Create Maps for logs
      const workoutLogsMap = new Map();
      const mealLogsMap = new Map();

      // Populate the maps
      allWorkoutLogs.forEach(log => {
        if (log.clientProgramId) {
          const logs = workoutLogsMap.get(log.clientProgramId) || [];
          logs.push(log);
          workoutLogsMap.set(log.clientProgramId, logs);
        }
      });

      allMealLogs.forEach(log => {
        if (log.clientProgramId) {
          const logs = mealLogsMap.get(log.clientProgramId) || [];
          logs.push(log);
          mealLogsMap.set(log.clientProgramId, logs);
        }
      });

      // Transform data for dashboard
      const clients = coachPrograms.flatMap(program =>
        program.clientPrograms.map(enrollment => {
          if (!enrollment.client?.user) return null;

          const workouts = workoutLogsMap.get(enrollment.id) || [];
          const meals = mealLogsMap.get(enrollment.id) || [];
          const clientUser = enrollment.client.user;

          // Better client name handling
          const clientName = clientUser.fullName ||
            clientUser.username?.split('@')[0] ||
            'Unnamed Client';

          return {
            id: enrollment.client.id,
            name: clientName,
            email: clientUser.email,
            programName: program.name,
            programType: program.type,
            lastActive: enrollment.startDate,
            progress: {
              totalWorkouts: workouts.length,
              lastWorkout: workouts[0]?.date || null,
              lastMeal: meals[0]?.date || null,
              programCompletion: Math.round((workouts.length / (program.cycleLength || 1)) * 100),
            },
            stats: {
              averageCalories: meals.length > 0
                ? Math.round(meals.reduce((acc, meal) => acc + (meal.calories || 0), 0) / meals.length)
                : 0,
              totalWorkouts: workouts.length,
              workoutFrequency: Math.round((workouts.length / (program.cycleLength || 1)) * 100) / 100
            }
          };
        }).filter(Boolean)
      );

      const stats = {
        totalClients: clients.length,
        activePrograms: coachPrograms.filter(p => p.status === 'active').length,
        totalWorkouts: Array.from(workoutLogsMap.values())
          .reduce((acc, logs) => acc + logs.length, 0)
      };

      const programTypes = {
        lifting: coachPrograms.filter(p => p.type === 'lifting').length,
        diet: coachPrograms.filter(p => p.type === 'diet').length,
        posing: coachPrograms.filter(p => p.type === 'posing').length,
        'all-inclusive': coachPrograms.filter(p => p.type === 'all-inclusive').length
      };

      res.json({ clients, stats, programTypes });
    } catch (error: any) {
      console.error("Error fetching coach dashboard:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        details: error.message
      });
    }
  });

  // Fixed meal logs orderBy clause
  app.get("/api/client/dashboard", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [recentMeals, workoutData] = await Promise.all([
        // Recent meals with fixed orderBy syntax
        db.query.mealLogs.findMany({
          where: eq(mealLogs.clientId, req.user.id),
          orderBy: [desc(mealLogs.date)],
          limit: 10
        }),
        db.query.workoutLogs.findMany({
          where: eq(workoutLogs.clientId, req.user.id),
          orderBy: [desc(workoutLogs.date)],
          limit: 10
        })
      ]);

      // Calculate statistics
      const stats = {
        totalWorkouts: workoutData.length,
        averageCalories: recentMeals.length > 0
          ? Math.round(recentMeals.reduce((acc, meal) => acc + (meal.calories || 0), 0) / recentMeals.length)
          : 0,
        programProgress: workoutData.length > 0 ? Math.round((workoutData.length / 30) * 100) : 0
      };

      res.json({
        stats,
        workouts: workoutData,
        meals: recentMeals
      });
    } catch (error: any) {
      console.error("Error fetching client dashboard:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        details: error.message
      });
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

      // Verify the client has access to this program and get program details
      const [enrollment] = await db.query.clientPrograms.findMany({
        where: and(
          eq(clientPrograms.id, clientProgramId),
          eq(clientPrograms.clientId, req.user.id)
        ),
        with: {
          program: {
            with: {
              routines: {
                where: eq(routines.id, routineId),
                with: {
                  exercises: {
                    orderBy: programExercises.orderInRoutine,
                  }
                }
              }
            }
          }
        },
        limit: 1,
      });

      if (!enrollment) {
        return res.status(404).send("Program enrollment not found");
      }

      console.log('[Debug] Found enrollment:', {
        id: enrollment.id,
        programId: enrollment.program?.id,
        routineCount: enrollment.program?.routines.length
      });

      const routine = enrollment.program?.routines[0];
      if (!routine) {
        return res.status(404).send("Routine not found");
      }

      console.log('[Debug] Found routine:', {
        id: routine.id,
        name: routine.name,
        exerciseCount: routine.exercises.length
      });

      // Create exercise map for validation and name lookup
      const exerciseMap = new Map(
        routine.exercises.map(ex => [ex.id, ex])
      );

      // Validate and transform exercise logs
      const exerciseLogs = data.exerciseLogs.map((log: any) => {
        const exercise = exerciseMap.get(log.exerciseId);

        console.log('[Debug] Mapping exercise:', {
          logExerciseId: log.exerciseId,
          foundExercise: exercise?.name,
          logSets: log.sets
        });

        return {
          exerciseId: log.exerciseId,
          exerciseName: exercise?.name || 'Unknown Exercise', // Use program exercise name
          sets: log.sets.map((set: any) => ({
            weight: set.weight,
            reps: set.reps
          }))
        };
      });

      // Create workout log with proper names
      const [log] = await db.insert(workoutLogs)
        .values({
          clientId: req.user.id,
          clientProgramId,
          routineId,
          data: {
            exerciseLogs,
            routineName: routine.name, // Store actual routine name
            notes: data.notes
          },
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

  // Update workout log endpoint
  app.put("/api/workouts/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const logId = parseInt(req.params.id);
      const { data } = req.body;

      // First verify the workout log belongs to this user
      const [workoutLog] = await db.query.workoutLogs.findMany({
        where: and(
          eq(workoutLogs.id, logId),
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

      // Update the workout log with the new data
      const [updatedLog] = await db
        .update(workoutLogs)
        .set({
          data: {
            exerciseLogs: data.exerciseLogs.map(log => ({
              exerciseId: log.exerciseId,
              exerciseName: log.exerciseName,
              sets: log.sets
            })),
            notes: data.notes
          }
        })
        .where(and(
          eq(workoutLogs.id, logId),
          eq(workoutLogs.clientId, req.user.id)
        ))
        .returning();

      res.json(updatedLog);
    } catch (error: any) {
      console.error("Error updating workout log:", error);
      res.status(500).send(error.message);
    }
  });

  // Add PUT endpoint for updating meal logs
  app.put("/api/meals/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const logId = parseInt(req.params.id);
      const { data } = req.body;

      // First verify the meal log belongs to this user
      const [mealLog] = await db.query.mealLogs.findMany({
        where: and(
          eq(mealLogs.id, logId),
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

      // Update the meal log
      const [updatedLog] = await db
        .update(mealLogs)
        .set({
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          data: data.mealData,
          date: new Date()
        })
        .where(and(
          eq(mealLogs.id, logId),
          eq(mealLogs.clientId, req.user.id)
        ))
        .returning();

      res.json(updatedLog);
    } catch (error: any) {
      console.error("Error updating meal log:", error);
      res.status(500).send(error.message);
    }
  });

  // Add new meal log
  app.post("/api/meals", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { clientProgramId, data } = req.body;

      // Verify the program enrollment exists and belongs to this user
      const [enrollment] = await db.query.clientPrograms.findMany({
        where: and(
          eq(clientPrograms.id, clientProgramId),
          eq(clientPrograms.clientId, req.user.id)
        ),
        limit: 1
      });

      if (!enrollment) {
        return res.status(404).json({
          error: "Program enrollment not found",
          message: "The requested program enrollment does not exist or you don't have access to it"
        });
      }

      // Create the meal log
      const [mealLog] = await db.insert(mealLogs)
        .values({
          clientId: req.user.id,
          clientProgramId: clientProgramId,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats,
          data: {
            notes: data.notes
          },
          date: new Date()
        })
        .returning();

      console.log(`[Debug] Created meal log:`, mealLog);

      res.json(mealLog);
    } catch (error: any) {
      console.error("Error creating meal log:", error);
      res.status(500).json({
        error: "Failed to create meal log",
        details: error.message
      });
    }
  });


  // Get meal logs for a specific program
  app.get("/api/meals/:programId", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      console.log(`[Debug] Fetching meal logs for program ${req.params.programId} and user ${req.user.id}`);

      // Verify the program enrollment exists and belongs to this user
      const [enrollment] = await db.query.clientPrograms.findMany({
        where: and(
          eq(clientPrograms.id, parseInt(req.params.programId)),
          eq(clientPrograms.clientId, req.user.id)
        ),
        limit: 1
      });

      if (!enrollment) {
        return res.status(404).json({
          error: "Program enrollment not found",
          message: "The requested program enrollment does not exist or you don't have access to it"
        });
      }

      // Get meal logs with strict filtering by both clientId and clientProgramId
      const logs = await db.query.mealLogs.findMany({
        where: and(
          eq(mealLogs.clientId, req.user.id),
          eq(mealLogs.clientProgramId, parseInt(req.params.programId))
        ),
        orderBy: [desc(mealLogs.date)]
      });

      console.log(`[Debug] Found ${logs.length} meal logs for client ${req.user.id} in program ${req.params.programId}`);

      // Transform logs with edit/delete capabilities and proper data formatting
      const formattedLogs = logs.map(log => ({
        id: log.id,
        date: log.date,
        calories: log.calories || 0,
        protein: log.protein || 0,
        carbs: log.carbs || 0,
        fats: log.fats || 0,
        notes: log.data?.notes || '',
        canEdit: true,
        canDelete: true
      }));

      res.json(formattedLogs);
    } catch (error: any) {
      console.error("Error fetching meal logs:", error);
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

    try {
      const [workouts, meals, workoutStats, nutritionStats] = await Promise.all([
        // Recent workouts
        db.query.workoutLogs.findMany({
          where: eq(workoutLogs.clientId, req.user.id),
          orderBy: [desc(workoutLogs.date)],
          limit: 10
        }),
        // Recent meals
        db.query.mealLogs.findMany({
          where: eq(mealLogs.clientId, req.user.id),
          orderBy: [desc(mealLogs.date)],
          limit: 10
        }),
                // Workout statistics
        db.query.workoutLogs.findMany({
          where: eq(workoutLogs.clientId, req.user.id),
          orderBy: [desc(workoutLogs.date)],
          limit: 30 // Last 30 days of workout data
        }),
        // Nutrition statistics
        db.query.mealLogs.findMany({
          where: eq(mealLogs.clientId, req.user.id),
          orderBy: [desc(mealLogs.date)],
          limit: 30 // Last 30 days of nutrition data
        })
      ]);

      // Calculate statistics
      const stats = {
        workouts: {
          total: workoutStats.length,
          frequency: workoutStats.length / 4, // Per week over last 30 days
          lastWorkout: workoutStats[0]?.date || null,
        },
        nutrition: {
          averageCalories: nutritionStats.length > 0
            ? Math.round(nutritionStats.reduce((acc, meal) => acc + (meal.calories || 0), 0) / nutritionStats.length)
            : 0,
          averageProtein: nutritionStats.length > 0
            ? Math.round(nutritionStats.reduce((acc, meal) => acc + (meal.protein || 0), 0) / nutritionStats.length)
            : 0,
          lastMeal: nutritionStats[0]?.date || null,
        }
      };

      res.json({
        recentWorkouts: workouts,
        recentMeals: meals,
        stats
      });
    } catch (error: any) {
      console.error("Error fetching progress data:", error);
      res.status(500).json({
        error: "Failed to fetch progress data",
        details: error.message
      });
    }
  });

  // Add new endpoint for coach to view client history
  app.get("/api/coach/client/:clientId/history", async (req, res) => {
    if (!req.user || req.user.accountType !== "coach") {
      return res.status(403).json({
        error: "Access denied",
        message: "Only coaches can access this endpoint"
      });
    }

    try {
      const clientId = parseInt(req.params.clientId);

      // Verify this client is assigned to the coach
      const [clientProgram] = await db.query.clientPrograms.findMany({
        where: and(
          eq(clientPrograms.clientId, clientId),
          eq(programs.coachId, req.user.id)
        ),
        with: {
          program: true,
          client: {
            with: {
              user: {
                columns: {
                  fullName: true,
                  email: true,
                  username: true,
                }
              }
            }
          }
        },
        limit: 1
      });

      if (!clientProgram) {
        return res.status(404).json({
          error: "Client not found",
          message: "The requested client was not found or is not assigned to you"
        });
      }

      const [workouts, meals] = await Promise.all([
        db.query.workoutLogs.findMany({
          where: eq(workoutLogs.clientId, clientId),
          orderBy: [desc(workoutLogs.date)],
          limit: 30
        }),
        db.query.mealLogs.findMany({
          where: eq(mealLogs.clientId, clientId),
          orderBy: [desc(mealLogs.date)],
          limit: 30
        })
      ]);

      res.json({
        client: {
          id: clientId,
          name: clientProgram.client.user.fullName ||
                clientProgram.client.user.username?.split('@')[0] ||
                'Unnamed Client',
          email: clientProgram.client.user.email
        },
        workouts,
        meals,
        programDetails: clientProgram.program
      });
    } catch (error: any) {
      console.error("Error fetching client history:", error);
      res.status(500).json({
        error: "Failed to fetch client history",
        details: error.message
      });
    }
  });

  //Updated workout history
  app.get("/api/workouts/:programId", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      console.log(`[Debug] Fetching workout historyfor program ${req.params.programId} and user ${req.user.id}`);

      // First verify the program enrollment exists and belongs to this user
      const [enrollment] = await db.query.clientPrograms.findMany({
        where: and(
          eq(clientPrograms.id, parseInt(req.params.programId)),
          eq(clientPrograms.clientId, req.user.id)
        ),
        with: {
          program: {
            with: {
              routines: {
                with: {
                  exercises: {
                    orderBy: programExercises.orderInRoutine,
                  }
                },
                orderBy: routines.orderInCycle,
              }
            }
          }
        }
      });

      if (!enrollment) {
        return res.status(404).json({
          error: "Program enrollment not found",
          message: "The requested program enrollment does not exist or you don't have access to it"
        });
      }

      // Create maps for quick lookups
      const routineMap = new Map(
        enrollment.program?.routines.map(r => [r.id, r]) || []
      );

      const exerciseMap = new Map();
      enrollment.program?.routines.forEach(routine => {
        routine.exercises.forEach(exercise => {
          exerciseMap.set(exercise.id, exercise);
        });
      });

      // Fetch workout logs with strict filtering by both clientId and clientProgramId
      const logs = await db.query.workoutLogs.findMany({
        where: and(
          eq(workoutLogs.clientId, req.user.id),
          eq(workoutLogs.clientProgramId, parseInt(req.params.programId))
        ),
        orderBy: [desc(workoutLogs.date)],
        columns: {
          id: true,
          date: true,
          routineId: true,
          data: true,
          clientId: true,
          clientProgramId: true
        }
      });

      console.log(`[Debug] Found ${logs.length} workout logs for client ${req.user.id} in program ${req.params.programId}`);

      // Format logs using the stored routine name and exercise data
      const formattedLogs = logs.map(log => {
        const routine = routineMap.get(log.routineId);
        return {
          id: log.id,
          date: log.date,
          routineId: log.routineId,
          routineName: routine?.name || "Unknown Routine",
          exercises: log.data?.exerciseLogs?.map((exerciseLog: any) => {
            const exercise = exerciseMap.get(exerciseLog.exerciseId);
            return {
              id: exerciseLog.exerciseId,
              name: exercise?.name || "Unknown Exercise",
              sets: exerciseLog.sets || []
            };
          }) || [],
          notes: log.data?.notes,
          canDelete: true,
          canEdit: true
        };
      });

      res.json(formattedLogs);
    } catch (error: any) {
      console.error("Error fetching workout logs:", error);
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
        return res.status(404).send("Program not found or you dont have permission to delete it");
      }

      // Delete program and all related data
      await db.transaction(async (tx) => {
        // Delete program exercises
        await tx
          .delete(programExercises)
          .where(
            inArray(              programExercises.routineId,
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