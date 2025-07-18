import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CREATE a new exercise
export async function POST(req: NextRequest) {
  const data = await req.json();
  const exercise = await prisma.exercise.create({
    data: {
      ...data,
      // All fields are already strings from the frontend
      // No need to join or stringify again
    }
  });
  return NextResponse.json(exercise);
}

// GET all exercises
export async function GET() {
  const exercises = await prisma.exercise.findMany();
  // Convert string fields back to arrays/objects for frontend use
  const parsed = exercises.map((e: any) => ({
    ...e,
    tags: e.tags ? e.tags.split(',') : [],
    equipment: e.equipment ? e.equipment.split(',') : [],
    muscleGroups: e.muscleGroups ? e.muscleGroups.split(',') : [],
    jointsOfInterest: e.jointsOfInterest ? e.jointsOfInterest.split(',') : [],
    instructions: e.instructions ? JSON.parse(e.instructions) : [],
    relatedExercises: e.relatedExercises ? e.relatedExercises.split(',') : [],
  }));
  return NextResponse.json(parsed);
}
