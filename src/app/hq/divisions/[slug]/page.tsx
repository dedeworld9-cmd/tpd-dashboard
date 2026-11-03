import { notFound } from "next/navigation";
import { DivisionWorkspace } from "@/components/workspaces/division";
import { DIVISIONS } from "@/lib/sample-data";

export function generateStaticParams() {
  return DIVISIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: DIVISIONS.find((d) => d.slug === slug)?.name ?? "Division" };
}

export default async function DivisionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!DIVISIONS.some((d) => d.slug === slug)) notFound();
  return <DivisionWorkspace slug={slug} />;
}
