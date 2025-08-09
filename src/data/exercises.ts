export type Exercise = {
  id: string;
  title: string;
  description: string;
  image: string;
  referenceVideoUrl: string;
  referenceKeypointsUrl: string;
  tags: string[];
  equipment: string[];
  level: string;
  muscleGroups: string[];
  jointsOfInterest: string[];
  createdBy: string;
  dateAdded: string;
  instructions: string[];
  author: { name: string; profileUrl?: string };
  relatedExercises: string[];
};