"use client";
import { useState, useEffect } from 'react';
import { generateAndUploadThumbnail } from '@/lib/thumbnailGenerator';

interface Exercise {
  id: string;
  title: string;
  image: string;
  referenceVideoUrl: string;
  tags?: string[] | string;
  equipment?: string[] | string;
  muscleGroups?: string[] | string;
  jointsOfInterest?: string[] | string;
  instructions?: string[] | string;
  relatedExercises?: string[] | string;
  level?: string;
  createdBy?: string;
  dateAdded?: string;
  authorName?: string;
  authorProfileUrl?: string | null;
}

export default function ThumbnailGenerator() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const res = await fetch('/api/exercises');
      if (!res.ok) throw new Error('Failed to load exercises');
      const data = await res.json();
      setExercises(data);
    } catch (err) {
      console.error('Error loading exercises:', err);
    }
  };

  const generateThumbnailForExercise = async (exercise: Exercise) => {
    if (!exercise.referenceVideoUrl) {
      alert(`No video URL found for exercise: ${exercise.title}`);
      return;
    }

    setProcessing(exercise.id);
    try {
      console.log(`Generating thumbnail for exercise: ${exercise.title}`);
      console.log(`Video URL: ${exercise.referenceVideoUrl}`);
      
      const thumbnailFileName = `${exercise.id}-thumbnail.jpg`;
      const thumbnailUrl = await generateAndUploadThumbnail(
        exercise.referenceVideoUrl, 
        thumbnailFileName, 
        2
      );

      // Prepare exercise data for update (convert arrays to strings)
      const updateData = {
        ...exercise,
        image: thumbnailUrl,
        tags: Array.isArray(exercise.tags) ? exercise.tags.join(',') : exercise.tags,
        equipment: Array.isArray(exercise.equipment) ? exercise.equipment.join(',') : exercise.equipment,
        muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups.join(',') : exercise.muscleGroups,
        jointsOfInterest: Array.isArray(exercise.jointsOfInterest) ? exercise.jointsOfInterest.join(',') : exercise.jointsOfInterest,
        instructions: Array.isArray(exercise.instructions) ? JSON.stringify(exercise.instructions) : exercise.instructions,
        relatedExercises: Array.isArray(exercise.relatedExercises) ? exercise.relatedExercises.join(',') : exercise.relatedExercises,
      };

      // Update the exercise with the new thumbnail
      const updateResponse = await fetch(`/api/exercises/${exercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (updateResponse.ok) {
        alert(`Thumbnail generated successfully for: ${exercise.title}`);
        loadExercises(); // Refresh the list
      } else {
        throw new Error('Failed to update exercise');
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      alert(`Error generating thumbnail for ${exercise.title}: ${(error as Error).message}`);
    } finally {
      setProcessing(null);
    }
  };

  const generateAllThumbnails = async () => {
    const exercisesWithVideos = exercises.filter(ex => ex.referenceVideoUrl);
    
    if (exercisesWithVideos.length === 0) {
      alert('No exercises with videos found');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const exercise of exercisesWithVideos) {
      try {
        setProcessing(exercise.id);
        console.log(`Processing exercise: ${exercise.title}`);
        
        const thumbnailFileName = `${exercise.id}-thumbnail.jpg`;
        const thumbnailUrl = await generateAndUploadThumbnail(
          exercise.referenceVideoUrl, 
          thumbnailFileName, 
          2
        );

        // Prepare exercise data for update (convert arrays to strings)
        const updateData = {
          ...exercise,
          image: thumbnailUrl,
          tags: Array.isArray(exercise.tags) ? exercise.tags.join(',') : exercise.tags,
          equipment: Array.isArray(exercise.equipment) ? exercise.equipment.join(',') : exercise.equipment,
          muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups.join(',') : exercise.muscleGroups,
          jointsOfInterest: Array.isArray(exercise.jointsOfInterest) ? exercise.jointsOfInterest.join(',') : exercise.jointsOfInterest,
          instructions: Array.isArray(exercise.instructions) ? JSON.stringify(exercise.instructions) : exercise.instructions,
          relatedExercises: Array.isArray(exercise.relatedExercises) ? exercise.relatedExercises.join(',') : exercise.relatedExercises,
        };

        // Update the exercise with the new thumbnail
        const updateResponse = await fetch(`/api/exercises/${exercise.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (updateResponse.ok) {
          successCount++;
          console.log(`Successfully generated thumbnail for: ${exercise.title}`);
        } else {
          errorCount++;
          console.error(`Failed to update exercise: ${exercise.title}`);
        }
      } catch (error) {
        console.error(`Error generating thumbnail for ${exercise.title}:`, error);
        errorCount++;
      }
    }

    setLoading(false);
    setProcessing(null);
    alert(`Thumbnail generation complete!\nSuccess: ${successCount}\nErrors: ${errorCount}`);
    loadExercises(); // Refresh the list
  };

  return (
    <main className="bg-onyx-100">
      {/* Spacer for sticky header */}
      <div style={{ height: '24px', marginTop: '0' }}></div>
      <div className="pt-8">
        <div className="mx-auto py-4" style={{ maxWidth: '2560px', marginLeft: '45px', marginRight: '45px' }}>
          {/* Back Button */}
          <div className="px-4 mb-4">
            <button
              onClick={() => window.location.href = '/admin/upload'}
              className="px-4 py-2 bg-blue-100 text-white rounded-lg font-bold hover:bg-blue-90 transition"
            >
              ← Back to Admin Panel
            </button>
          </div>
          {/* Header */}
          <div className="px-4 mb-4">
            <h1 className="text-3xl font-bold text-onyx-10 mb-2">Thumbnail Generator</h1>
            <p className="text-onyx-30 text-lg">
              Generate video thumbnails for exercises automatically
            </p>
          </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <button
              onClick={generateAllThumbnails}
              disabled={loading}
                className="bg-blue-100 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-90 transition disabled:opacity-50"
            >
              {loading ? 'Generating All Thumbnails...' : 'Generate All Thumbnails'}
            </button>
            <p className="text-sm text-onyx-30 mt-2">
              This will generate thumbnails for all exercises that have videos but no custom images.
            </p>
          </div>

          <div className="grid gap-4">
            {exercises.map((exercise) => (
                <div key={exercise.id} className="bg-onyx-20 rounded-lg p-4 hover:bg-onyx-30 transition">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded flex items-center justify-center">
                      {exercise.image && exercise.image !== '/images/squat.jpg' ? (
                        <img 
                          src={exercise.image} 
                          alt={exercise.title} 
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-onyx-30 text-xs">No Image</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-onyx-10">{exercise.title}</h3>
                      <p className="text-sm text-onyx-30">
                        {exercise.referenceVideoUrl ? 'Has Video' : 'No Video'}
                      </p>
                      {exercise.referenceVideoUrl && (
                        <p className="text-xs text-onyx-40 mt-1">
                          Video: {exercise.referenceVideoUrl.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {exercise.referenceVideoUrl && (
                      <button
                        onClick={() => generateThumbnailForExercise(exercise)}
                        disabled={processing === exercise.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {processing === exercise.id ? 'Generating...' : 'Generate Thumbnail'}
                      </button>
                    )}
                    <button
                      onClick={loadExercises}
                        className="px-4 py-2 bg-blue-100 text-white rounded-lg text-sm hover:bg-blue-90 transition"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {exercises.length === 0 && (
            <div className="text-center py-8 text-onyx-30">
              <p>No exercises found. Create some exercises first!</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </main>
  );
} 