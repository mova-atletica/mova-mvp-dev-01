import CoachStudioGate from "./CoachStudioGate";
import CoachStudioProjects from "./CoachStudioProjects";

export default function CoachStudioPage() {
  return (
    <CoachStudioGate>
      <CoachStudioProjects />
    </CoachStudioGate>
  );
}
