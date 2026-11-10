import { GuidedWizard } from "@/components/wizard/guided-wizard";
import { HomeQuickDesign } from "@/components/wizard/HomeQuickDesign";
import { STYLES } from "@roomdesigner/shared";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";

export const metadata = { title: "New design" };

export default async function NewDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string }>;
}) {
  await requireOnboarded();
  const { user, workspace } = await requireWorkspace();
  const { style } = await searchParams;
  const initialStyle =
    style !== undefined && STYLES.some((entry) => entry.key === style) ? style : undefined;
  return user.mode === "PRO" ? (
    <GuidedWizard currency={workspace.currency} initialStyle={initialStyle} />
  ) : (
    <HomeQuickDesign initialStyle={initialStyle} />
  );
}
