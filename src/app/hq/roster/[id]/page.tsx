import { notFound } from "next/navigation";
import { MemberProfilePage } from "@/components/personnel/member-profile-page";
import { MEMBERS } from "@/lib/sample-data";

export const metadata = { title: "Member profile" };

export function generateStaticParams() {
  return MEMBERS.map((m) => ({ id: m.id }));
}

export default async function ProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!MEMBERS.some((m) => m.id === id)) notFound();
  return <MemberProfilePage id={id} />;
}
