"use client";

import { useParams } from "next/navigation";
import ExerciseStudioPage from "../../../../components/exercise-studio/ExerciseStudioPage";

export default function ArchiveExercisePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  return <ExerciseStudioPage exerciseId={id} />;
}
