import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🔍 API: Fetching exercise with ID:', id);
    
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        repAnalysis: true,
        poseAnalysis: true,
      }
    });

    console.log('🔍 API: Exercise found:', exercise ? 'Yes' : 'No');
    if (exercise) {
      console.log('🔍 API: Exercise data:', {
        id: exercise.id,
        title: exercise.title,
        exerciseType: exercise.exerciseType,
        referenceVideoUrl: exercise.referenceVideoUrl,
        referenceKeypointsUrl: exercise.referenceKeypointsUrl,
        hasPoseAnalysis: !!exercise.poseAnalysis,
        poseAnalysisKeys: exercise.poseAnalysis ? Object.keys(exercise.poseAnalysis) : null
      });
    }

    if (!exercise) {
      console.log('❌ API: Exercise not found for ID:', id);
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Parse string fields to arrays for consistency
    const parsedExercise = {
      ...exercise,
      tags: exercise.tags ? exercise.tags.split(',') : [],
      equipment: exercise.equipment ? exercise.equipment.split(',') : [],
      muscleGroups: exercise.muscleGroups ? exercise.muscleGroups.split(',') : [],
      jointsOfInterest: exercise.jointsOfInterest ? exercise.jointsOfInterest.split(',') : [],
      instructions: exercise.instructions ? JSON.parse(exercise.instructions) : [],
      relatedExercises: exercise.relatedExercises ? exercise.relatedExercises.split(',') : [],
      // Parse pose analysis data from JSON strings
      poseAnalysis: exercise.poseAnalysis ? {
        ...exercise.poseAnalysis,
        targetPoses: exercise.poseAnalysis.targetPoses ? JSON.parse(exercise.poseAnalysis.targetPoses) : [],
        angleRanges: exercise.poseAnalysis.angleRanges ? JSON.parse(exercise.poseAnalysis.angleRanges) : {},
        primaryJoints: exercise.poseAnalysis.primaryJoints ? exercise.poseAnalysis.primaryJoints.split(',') : [],
        toleranceMultipliers: exercise.poseAnalysis.toleranceMultipliers ? JSON.parse(exercise.poseAnalysis.toleranceMultipliers) : {},
        feedbackMessages: exercise.poseAnalysis.feedbackMessages ? JSON.parse(exercise.poseAnalysis.feedbackMessages) : {}
      } : null,
    };

    // Debug parsed pose analysis data
    if (parsedExercise.poseAnalysis) {
      console.log('🔍 Parsed pose analysis data:', {
        targetPoses: parsedExercise.poseAnalysis.targetPoses,
        angleRanges: parsedExercise.poseAnalysis.angleRanges,
        primaryJoints: parsedExercise.poseAnalysis.primaryJoints,
        toleranceMultipliers: parsedExercise.poseAnalysis.toleranceMultipliers,
        feedbackMessages: parsedExercise.poseAnalysis.feedbackMessages
      });
    }

    return NextResponse.json({ exercise: parsedExercise });
  } catch (error) {
    console.error('Error fetching exercise:', error);
    return NextResponse.json({ error: 'Failed to fetch exercise' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();
    
    console.log('Updating exercise:', id, 'with data:', updateData);

    // Convert array fields to strings for database storage
    const processedData = {
      title: updateData.title,
      description: updateData.description,
      image: updateData.image,
      referenceVideoUrl: updateData.referenceVideoUrl,
      referenceKeypointsUrl: updateData.referenceKeypointsUrl,
      tags: Array.isArray(updateData.tags) ? updateData.tags.join(',') : updateData.tags,
      equipment: Array.isArray(updateData.equipment) ? updateData.equipment.join(',') : updateData.equipment,
      muscleGroups: Array.isArray(updateData.muscleGroups) ? updateData.muscleGroups.join(',') : updateData.muscleGroups,
      jointsOfInterest: Array.isArray(updateData.jointsOfInterest) ? updateData.jointsOfInterest.join(',') : updateData.jointsOfInterest,
      createdBy: updateData.createdBy,
      instructions: Array.isArray(updateData.instructions) ? JSON.stringify(updateData.instructions) : updateData.instructions,
      authorName: updateData.authorName,
      authorProfileUrl: updateData.authorProfileUrl,
      relatedExercises: Array.isArray(updateData.relatedExercises) ? updateData.relatedExercises.join(',') : updateData.relatedExercises,
      exerciseType: updateData.exerciseType,
      exerciseSubtype: updateData.exerciseSubtype,
      classificationConfidence: updateData.classificationConfidence,
    };

    console.log('Processed data for database:', processedData);

    // Update the exercise
    const updatedExercise = await prisma.exercise.update({
      where: { id },
      data: processedData
    });

    console.log('Exercise updated successfully:', updatedExercise.id);
    return NextResponse.json({ success: true, exercise: updatedExercise });
  } catch (error) {
    console.error('Error updating exercise:', error);
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete related analysis data first
    await prisma.repAnalysis.deleteMany({
      where: { exerciseId: id }
    });
    
    await prisma.poseAnalysis.deleteMany({
      where: { exerciseId: id }
    });

    // Delete the exercise
    await prisma.exercise.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 });
  }
}
