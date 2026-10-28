import { CopyButton } from "@/components/CopyButton";
import { shortUrlFor } from "@/lib/affiliateConfig";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, getMockLinks } from "@/lib/mockData";

export const metadata = { title: "My links · Kamai" };

export default async function LinksPage() {
  const user = await requirePageUser("/links");
  let links: Array<{
    id: string;
    code: string;
    canonicalUrl: string;
    clickCount: number;
    createdAt: Date;
    store: { name: string };
    deal?: { title: string } | null;
  }> = [];

  if (!isDatabaseConfigured()) {
    links = getMockLinks(user.id);
  } else {
    try {
      links = await prisma.generatedLink.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { store: { select: { name: true } }, deal: { select: { title: true } } },
      });
    } catch (err) {
      console.warn("Database error in LinksPage, using mock links:", err);
      links = getMockLinks(user.id);
    }
  }

  return (
    <div className="pt-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">My links</h1>
      <p className="mt-1 text-sm text-ink-soft">Every profit link you’ve made, with how many people clicked.</p>

      {links.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
          <p className="font-display text-lg font-bold">No links yet</p>
          <p className="mt-1 text-sm text-ink-soft">Tap the orange Make Link button to create your first one.</p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{l.deal?.title ?? l.canonicalUrl.replace(/^https:\/\//, "")}</p>
                <p className="num truncate text-xs text-ink-faint">
                  {l.store.name} · {shortUrlFor(l.code).replace(/^https?:\/\//, "")} ·{" "}
                  {l.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="num text-right text-sm font-bold">
                  {l.clickCount}
                  <span className="block text-[11px] font-medium text-ink-faint">clicks</span>
                </span>
                <CopyButton value={shortUrlFor(l.code)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
