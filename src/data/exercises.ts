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

export const exercises: Exercise[] = [
  {
    id: "squat",
    title: "Barbell Squat",
    description: "A foundational lower body exercise for strength and mobility.",
    image: "/images/squat.jpg",
    referenceVideoUrl: "/videos/squat-demo.mp4",
    referenceKeypointsUrl: "/keypoints/squat-demo.json",
    tags: ["legs", "strength", "barbell"],
    equipment: ["barbell"],
    level: "intermediate",
    muscleGroups: ["quads", "glutes", "hamstrings"],
    jointsOfInterest: ["leftKnee", "rightKnee", "leftHip", "rightHip"],
    createdBy: "admin",
    dateAdded: "2024-06-25T12:00:00Z",
    instructions: [
      "Set up the barbell at shoulder height.",
      "Step under the bar and position it across your upper back.",
      "Unrack the bar and step back.",
      "Set your feet shoulder-width apart.",
      "Lower your body by bending your knees and hips.",
      "Descend until your thighs are parallel to the floor.",
      "Push through your heels to return to standing."
    ],
    author: { name: "Coach Jane Doe", profileUrl: "https://example.com/jane" },
    relatedExercises: ["front-squat", "goblet-squat"]
  },
  // Add more exercises as needed
];
