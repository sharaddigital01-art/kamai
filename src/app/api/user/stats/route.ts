import { GET as reportsGet, POST as reportsPost } from "@/app/api/reports/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  return reportsGet(req);
}

export async function POST(req: Request) {
  return reportsPost(req);
}
