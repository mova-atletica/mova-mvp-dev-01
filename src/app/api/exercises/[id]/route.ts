import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET a single exercise by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const exercise = await prisma.exercise.findUnique({
      where: { id }
    });
    
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }
    
    return NextResponse.json(exercise);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    return NextResponse.json({ error: 'Failed to fetch exercise' }, { status: 500 });
  }
}

// UPDATE an exercise by ID
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await req.json();
    const { id } = await params;
    
    // Convert arrays to strings for database storage
    const processedData = {
      ...data,
      tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags,
      equipment: Array.isArray(data.equipment) ? data.equipment.join(',') : data.equipment,
      muscleGroups: Array.isArray(data.muscleGroups) ? data.muscleGroups.join(',') : data.muscleGroups,
      jointsOfInterest: Array.isArray(data.jointsOfInterest) ? data.jointsOfInterest.join(',') : data.jointsOfInterest,
      instructions: Array.isArray(data.instructions) ? JSON.stringify(data.instructions) : data.instructions,
      relatedExercises: Array.isArray(data.relatedExercises) ? data.relatedExercises.join(',') : data.relatedExercises,
    };
    
    const updated = await prisma.exercise.update({
      where: { id },
      data: processedData
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating exercise:', error);
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 });
  }
}

// DELETE an exercise by ID
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.exercise.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 });
  }
}
