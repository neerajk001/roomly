import { ProposalActions } from "@/components/proposals/proposal-actions";
import { prisma } from "@roomdesigner/db";
import { formatMoney } from "@roomdesigner/shared";
import { presignGet } from "@roomdesigner/storage";
import { getPublicProposal } from "@/server/services/proposals";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Proposal",
  robots: { index: false, follow: false },
};

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const proposal = await getPublicProposal(prisma, token, (key) => presignGet(key)).catch(
    () => null,
  );
  if (proposal === null) notFound();

  return (
    <div className="min-h-dvh bg-muted/30">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: proposal.brandColor ?? "#111827" }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-normal text-muted-foreground">{proposal.brandName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {proposal.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {proposal.projectName}
              {proposal.clientName !== null ? ` · ${proposal.clientName}` : ""}
            </p>
          </div>
          {proposal.logoUrl !== null && (
            /* eslint-disable-next-line @next/next/no-img-element -- signed URL */
            <img
              src={proposal.logoUrl}
              alt={`${proposal.brandName} logo`}
              className="h-10 w-auto"
            />
          )}
        </header>

        {proposal.pdfUrl !== null && (
          <p>
            <a href={proposal.pdfUrl} className="text-sm underline">
              Download PDF
            </a>
          </p>
        )}

        {proposal.intro !== null && (
          <p className="whitespace-pre-line text-sm text-foreground">{proposal.intro}</p>
        )}

        <section className="space-y-3" aria-label="Concept options">
          <h2 className="text-lg font-semibold text-foreground">Options</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {proposal.options.map((option) => (
              <li
                key={option.id}
                className="overflow-hidden rounded-lg border border-border bg-background"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                <img
                  src={option.url}
                  alt={option.caption ?? "Concept option"}
                  className="block w-full"
                />
                {option.caption !== null && (
                  <p className="border-t border-border px-3 py-2 text-sm">{option.caption}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Renders are concept visuals and not to scale.
          </p>
        </section>

        <section className="rounded-xl rounded-xl border border-border bg-background p-5">
          <ProposalActions token={token} proposal={proposal} />
        </section>

        <details className="rounded-xl rounded-xl border border-border bg-background p-5">
          <summary className="cursor-pointer text-sm font-medium">
            Estimate (v{proposal.estimate.version}) —{" "}
            {formatMoney(proposal.estimate.totalMinor, proposal.currency)}
          </summary>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">Item</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {proposal.estimate.lines.map((line) => (
                <tr key={line.label + String(line.quantity)} className="border-t border-border">
                  <td className="py-1">{line.label}</td>
                  <td className="py-1 text-right">{line.quantity}</td>
                  <td className="py-1 text-right">
                    {formatMoney(line.totalMinor, proposal.currency)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border font-medium">
                <td className="py-1" colSpan={2}>
                  Total
                </td>
                <td className="py-1 text-right">
                  {formatMoney(proposal.estimate.totalMinor, proposal.currency)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Estimate is based on provided measurements and the rates shown.
          </p>
        </details>

        {proposal.terms !== null && (
          <section className="space-y-1 text-sm">
            <h2 className="font-semibold">Terms</h2>
            <p className="whitespace-pre-line text-muted-foreground">{proposal.terms}</p>
          </section>
        )}

        {proposal.status === "EXPIRED" && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            This proposal has expired. Ask your designer for an updated version.
          </p>
        )}
      </div>
    </div>
  );
}
