import { HomeQuickDesign } from "@/components/wizard/HomeQuickDesign";
import { redirect } from "next/navigation";
import { STYLES } from "@roomdesigner/shared";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";

export const metadata = { title: "New design" };

export default async function NewDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; details?: string }>;
}) {
  await requireOnboarded();
  await requireWorkspace();
  const { style, details } = await searchParams;
  const initialStyle =
    style !== undefined && STYLES.some((entry) => entry.key === style) ? style : undefined;
  if (details === "1")
    redirect(
      "/studio/projects/new?details=1" +
        (initialStyle ? "&style=" + encodeURIComponent(initialStyle) : ""),
    );
  return <HomeQuickDesign initialStyle={initialStyle} />;
}
