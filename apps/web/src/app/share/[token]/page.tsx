import { ShareGallery } from "@/components/share/share-gallery";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { getSharedGallery } from "@/server/services/share";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Shared concepts",
  robots: { index: false, follow: false },
};

function cookieName(token: string): string {
  return `share_votes_${token.slice(0, 16)}`;
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const gallery = await getSharedGallery(prisma, token, (key) => presignGet(key)).catch(() => null);
  if (gallery === null) notFound();

  const store = await cookies();
  const raw = store.get(cookieName(token))?.value;
  const initiallyVoted = raw !== undefined && raw !== "" ? raw.split(".") : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Design concepts</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {gallery.projectName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick the option you like best. One vote per image; no account needed.
        </p>
      </header>

      <ShareGallery
        token={token}
        outputs={gallery.outputs}
        beforeUrl={gallery.beforeUrl}
        initiallyVoted={initiallyVoted}
      />

      <p className="text-xs text-muted-foreground">
        AI-generated concept visual. Not to scale. Rough prices are illustrative.
      </p>
    </div>
  );
}
