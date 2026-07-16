import { Exercise } from '../data/exercises';

export interface CuratedSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  exercises: Exercise[];
}

export interface FeaturedContent {
  id: string;
  title: string;
  description: string;
  heroImage: string;
  exerciseId?: string;
  ctaText: string;
  ctaUrl?: string;
  badgeText: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

function parseExercisePayload(exerciseData: any): Exercise {
  return {
    ...exerciseData,
    tags: Array.isArray(exerciseData.tags)
      ? exerciseData.tags
      : exerciseData.tags
        ? exerciseData.tags.split(',').filter(Boolean)
        : [],
    equipment: Array.isArray(exerciseData.equipment)
      ? exerciseData.equipment
      : exerciseData.equipment
        ? exerciseData.equipment.split(',').filter(Boolean)
        : [],
    muscleGroups: Array.isArray(exerciseData.muscleGroups)
      ? exerciseData.muscleGroups
      : exerciseData.muscleGroups
        ? exerciseData.muscleGroups.split(',').filter(Boolean)
        : [],
    jointsOfInterest: Array.isArray(exerciseData.jointsOfInterest)
      ? exerciseData.jointsOfInterest
      : exerciseData.jointsOfInterest
        ? exerciseData.jointsOfInterest.split(',').filter(Boolean)
        : [],
    instructions: Array.isArray(exerciseData.instructions)
      ? exerciseData.instructions
      : exerciseData.instructions
        ? JSON.parse(exerciseData.instructions)
        : [],
    relatedExercises: Array.isArray(exerciseData.relatedExercises)
      ? exerciseData.relatedExercises
      : exerciseData.relatedExercises
        ? exerciseData.relatedExercises.split(',').filter(Boolean)
        : [],
    author: {
      name: exerciseData.authorName || exerciseData.author?.name || 'Unknown',
      profileUrl: exerciseData.authorProfileUrl || exerciseData.author?.profileUrl,
    },
  };
}

export async function fetchCuratedSections(): Promise<CuratedSection[]> {
  try {
    const response = await fetch('/api/curated-sections');
    if (!response.ok) {
      throw new Error('Failed to fetch curated sections');
    }
    const sections = await response.json();

    const sectionsWithExercises = await Promise.all(
      sections.map(async (section: any) => {
        try {
          const exerciseIds = JSON.parse(section.exercises || '[]');
          const exercises = await Promise.all(
            exerciseIds.map(async (item: any) => {
              try {
                const exerciseResponse = await fetch(`/api/exercises/${item.id}`);
                if (exerciseResponse.ok) {
                  const responseData = await exerciseResponse.json();
                  const exerciseData = responseData.exercise || responseData;
                  return parseExercisePayload(exerciseData);
                }
                return null;
              } catch (error) {
                console.error(`Error fetching exercise ${item.id}:`, error);
                return null;
              }
            })
          );

          return {
            ...section,
            exercises: exercises.filter(Boolean) as Exercise[],
          };
        } catch (error) {
          console.error(`Error parsing exercises for section ${section.id}:`, error);
          return {
            ...section,
            exercises: [],
          };
        }
      })
    );

    return sectionsWithExercises.filter((section) => section.exercises.length > 0);
  } catch (error) {
    console.error('Error fetching curated sections:', error);
    return [];
  }
}

export async function fetchFeaturedContent(): Promise<FeaturedContent | null> {
  try {
    const response = await fetch('/api/featured-content');
    if (!response.ok) {
      throw new Error('Failed to fetch featured content');
    }
    const featuredContent = await response.json();
    return featuredContent.length > 0 ? featuredContent[0] : null;
  } catch (error) {
    console.error('Error fetching featured content:', error);
    return null;
  }
}

export async function fetchExerciseById(id: string): Promise<Exercise | null> {
  try {
    const response = await fetch(`/api/exercises/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch exercise');
    }
    const responseData = await response.json();
    const exerciseData = responseData.exercise || responseData;
    return parseExercisePayload(exerciseData);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    return null;
  }
}
