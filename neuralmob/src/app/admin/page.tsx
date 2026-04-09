import { redirect } from "next/navigation";
import { requireSessionEmail } from "@/lib/server/session";
import { getAdminDashboardSummary } from "@/lib/db/queries";
import { isOwnerUnlimitedEmail } from "@/lib/server/owner-unlimited";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AdminPage() {
  const email = await requireSessionEmail();
  if (!email || !isOwnerUnlimitedEmail(email)) {
    redirect("/workspace");
  }

  const summary = await getAdminDashboardSummary(200);

  return (
    <main className="min-h-[100dvh] bg-[#0b1326] text-[#dae2fd] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#d0bcff]">Neural Mob Admin</p>
          <h1 className="text-3xl font-bold tracking-tight">Usage, balance, and user health</h1>
          <p className="text-sm text-[#cbc3d7]">
            Owner-only dashboard for monitoring credits, reservations, spend, and account mix.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#494454]/20 bg-[#131b2e] p-5">
            <p className="text-xs uppercase tracking-widest text-[#cbc3d7]/60">Users</p>
            <p className="mt-2 text-3xl font-bold">{summary.totals.userCount}</p>
            <p className="mt-1 text-xs text-[#94a3b8]">
              {summary.totals.freeUserCount} free, {summary.totals.paidUserCount} paid
            </p>
          </div>
          <div className="rounded-2xl border border-[#494454]/20 bg-[#131b2e] p-5">
            <p className="text-xs uppercase tracking-widest text-[#cbc3d7]/60">Available Credit</p>
            <p className="mt-2 text-3xl font-bold text-[#d0bcff]">{dollars(summary.totals.totalAvailableCreditCents)}</p>
            <p className="mt-1 text-xs text-[#94a3b8]">
              {dollars(summary.totals.totalReservedCreditCents)} reserved
            </p>
          </div>
          <div className="rounded-2xl border border-[#494454]/20 bg-[#131b2e] p-5">
            <p className="text-xs uppercase tracking-widest text-[#cbc3d7]/60">Lifetime Spend</p>
            <p className="mt-2 text-3xl font-bold text-[#4edea3]">{dollars(summary.totals.totalSpentCents)}</p>
            <p className="mt-1 text-xs text-[#94a3b8]">{summary.totals.totalLifetimeCalls} successful runs</p>
          </div>
          <div className="rounded-2xl border border-[#494454]/20 bg-[#131b2e] p-5">
            <p className="text-xs uppercase tracking-widest text-[#cbc3d7]/60">Gross Credit Stored</p>
            <p className="mt-2 text-3xl font-bold">{dollars(summary.totals.totalCreditBalanceCents)}</p>
            <p className="mt-1 text-xs text-[#94a3b8]">Before subtracting active reservations</p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#494454]/20 bg-[#131b2e] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Users</h2>
              <p className="text-sm text-[#94a3b8]">Newest accounts first. Balance columns are in USD.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#494454]/20 text-[#94a3b8]">
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Tier</th>
                  <th className="py-3 pr-4 font-medium">Available</th>
                  <th className="py-3 pr-4 font-medium">Reserved</th>
                  <th className="py-3 pr-4 font-medium">Spent</th>
                  <th className="py-3 pr-4 font-medium">Runs</th>
                  <th className="py-3 pr-4 font-medium">Charges</th>
                  <th className="py-3 font-medium">Last Charge</th>
                </tr>
              </thead>
              <tbody>
                {summary.users.map((user) => (
                  <tr key={user.id} className="border-b border-[#494454]/10 align-top">
                    <td className="py-3 pr-4 font-mono text-xs">{user.email}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full border border-[#494454]/25 px-2 py-1 text-[11px] uppercase tracking-wide text-[#d0bcff]">
                        {user.tier}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono">{dollars(user.availableCreditCents)}</td>
                    <td className="py-3 pr-4 font-mono">{dollars(user.reservedCreditCents)}</td>
                    <td className="py-3 pr-4 font-mono text-[#4edea3]">{dollars(user.totalSpentCents)}</td>
                    <td className="py-3 pr-4 font-mono">{user.lifetimeCalls}</td>
                    <td className="py-3 pr-4 font-mono">{user.eventCount}</td>
                    <td className="py-3 font-mono text-xs text-[#94a3b8]">
                      {user.lastChargeAt ? new Date(user.lastChargeAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-[#494454]/20 bg-[#131b2e] p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Recent Charges</h2>
            <p className="text-sm text-[#94a3b8]">Newest metered events across all users.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#494454]/20 text-[#94a3b8]">
                  <th className="py-3 pr-4 font-medium">Time</th>
                  <th className="py-3 pr-4 font-medium">User ID</th>
                  <th className="py-3 pr-4 font-medium">Model</th>
                  <th className="py-3 pr-4 font-medium">Tokens</th>
                  <th className="py-3 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-[#494454]/10 align-top">
                    <td className="py-3 pr-4 font-mono text-xs">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{event.userId}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{event.model}</td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {event.promptTokens}+{event.completionTokens}
                    </td>
                    <td className="py-3 font-mono text-xs text-[#4edea3]">{dollars(event.costCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
