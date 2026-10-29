import { GuidedWizard } from "@/components/wizard/guided-wizard";
import { getBalance, prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";

export const metadata = { title: "New design" };

export default async function NewDesignPage() {
  const { workspace } = await requireWorkspace();
  const credits = await getBalance(prisma, workspace.id);
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2a24]">New room design</h1>
        <p className="mt-1 text-sm text-[#5b665f]">Seven quick steps, then 3 concept visuals.</p>
      </div>
      <GuidedWizard currency={workspace.currency} credits={credits} />
    </div>
  );
}
