import CoachStudioGate from "../CoachStudioGate";
import CoachStudioEditor from "./CoachStudioEditor";

export default async function CoachStudioEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <CoachStudioGate>
      <CoachStudioEditor sessionId={id} />
    </CoachStudioGate>
  );
}
