export const metadata = { title: "Studio projects" };

export default function StudioHomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <button
          type="button"
          disabled
          title="Project creation arrives with uploads (V2)"
          className="cursor-not-allowed rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white opacity-60"
        >
          New project
        </button>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="text-base font-medium text-slate-900">No projects yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Create a project for a client, upload room photos and generate concept visuals.
        </p>
      </div>
    </div>
  );
}
