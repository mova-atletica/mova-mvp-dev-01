import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** @deprecated Use /programs/[slug] */
export default async function LegacySequenceRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/programs/${slug}`);
}
