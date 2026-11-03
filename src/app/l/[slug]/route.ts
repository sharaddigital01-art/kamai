import { GET as slugGet } from "@/app/[slug]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export { slugGet as GET };
