import { GuidedWizard } from "@/components/wizard/guided-wizard";
import { requireWorkspace } from "@/server/auth/session";

export const metadata = { title: "New design" };

export default async function NewDesignPage() {
  const { workspace } = await requireWorkspace();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design a room</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few quick questions, then 3 concept visuals and a rough cost range.
        </p>
      </div>
      <GuidedWizard currency={workspace.currency} />
    </div>
  );
}
