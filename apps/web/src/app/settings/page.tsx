import { signOutAction } from "@/app/(auth)/actions";
import { requireOnboarded, requireWorkspace } from "@/server/auth/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOnboarded();
  const { workspace, user, role } = await requireWorkspace();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Account and workspace preferences will be editable here.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-medium text-slate-900">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Name</dt>
            <dd className="text-slate-900">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Email</dt>
            <dd className="break-all text-slate-900">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Mode</dt>
            <dd className="text-slate-900">{user.mode === "PRO" ? "Professional" : "Home"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Role</dt>
            <dd className="text-slate-900">{role}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-medium text-slate-900">Workspace</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Name</dt>
            <dd className="text-slate-900">{workspace.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Type</dt>
            <dd className="text-slate-900">{workspace.type}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Currency</dt>
            <dd className="text-slate-900">{workspace.currency}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Units</dt>
            <dd className="text-slate-900">{workspace.unitSystem}</dd>
          </div>
        </dl>
      </section>

      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
