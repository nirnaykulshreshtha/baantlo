import { getAdminDashboardSummary } from "@/lib/admin/api"
import { requirePermission } from "@/lib/auth/session-helpers"

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function AdminDashboardPage() {
  await requirePermission("admin.full_access")

  const summary = await getAdminDashboardSummary()

  const metrics = [
    { label: "Total users", value: summary.metrics.totalUsers },
    { label: "Active groups", value: summary.metrics.activeGroups },
    { label: "Pending settlements", value: summary.metrics.pendingSettlements },
    { label: "Total expense volume (₹)", value: summary.metrics.totalExpenseAmount },
  ]

  const roleBreakdown = Object.entries(summary.metrics.memberRoleCounts)
  const statusBreakdown = Object.entries(summary.metrics.memberStatusCounts)
  const groups = summary.groups.slice(0, 6)
  const pendingInvites = summary.recentFriendInvites
    .filter((invite) => invite.status === "pending")
    .slice(0, 6)

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground">
          Monitor platform health, membership trends, and recent activity across Baantlo.
        </p>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(metric.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Member role distribution</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {roleBreakdown.length ? (
              roleBreakdown.map(([role, count]) => (
                <li key={role} className="flex items-center justify-between rounded-md border p-2">
                  <span className="capitalize">{role.replaceAll("_", " ")}</span>
                  <span className="font-medium text-foreground">{formatNumber(count)}</span>
                </li>
              ))
            ) : (
              <li className="rounded-md border p-2 text-muted-foreground/80">
                No role data available yet.
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Member status distribution</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {statusBreakdown.length ? (
              statusBreakdown.map(([status, count]) => (
                <li key={status} className="flex items-center justify-between rounded-md border p-2">
                  <span className="capitalize">{status.replaceAll("_", " ")}</span>
                  <span className="font-medium text-foreground">{formatNumber(count)}</span>
                </li>
              ))
            ) : (
              <li className="rounded-md border p-2 text-muted-foreground/80">
                No status data available yet.
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Recent groups</h2>
          <div className="mt-3 space-y-3">
            {groups.length ? (
              groups.map((group) => (
                <div
                  key={group.group_id}
                  className="rounded-md border p-3 text-sm"
                >
                  <p className="font-medium text-foreground">{group.name}</p>
                  <p className="text-muted-foreground">
                    {group.member_count} members · {group.currency ?? "INR"}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Created {group.created_at ? new Date(group.created_at).toLocaleDateString() : "recently"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border p-3 text-muted-foreground/80">
                No groups created yet.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Pending friend invites</h2>
          <div className="mt-3 space-y-3">
            {pendingInvites.length ? (
              pendingInvites.map((invite) => (
                <div key={invite.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium text-foreground">Invite #{invite.id}</p>
                  <p className="text-muted-foreground">
                    Status: {invite.status.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Sent{" "}
                    {invite.created_at
                      ? new Date(invite.created_at).toLocaleString()
                      : "recently"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border p-3 text-muted-foreground/80">
                No pending invites right now.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">System status</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center justify-between rounded-md border p-2">
              <span>Admin user seeded</span>
              <span className={summary.systemStatus.adminUserExists ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                {summary.systemStatus.adminUserExists ? "Yes" : "No"}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-md border p-2">
              <span>Database connection</span>
              <span className={summary.systemStatus.databaseConnected ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                {summary.systemStatus.databaseConnected ? "Healthy" : "Check backend"}
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Admin account</h2>
          {summary.adminInfo ? (
            <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between rounded-md border p-2">
                <dt>Email</dt>
                <dd className="font-medium text-foreground">{summary.adminInfo.email}</dd>
              </div>
              <div className="flex justify-between rounded-md border p-2">
                <dt>Display name</dt>
                <dd className="font-medium text-foreground">
                  {summary.adminInfo.display_name ?? "Not set"}
                </dd>
              </div>
              <div className="flex justify-between rounded-md border p-2">
                <dt>Role</dt>
                <dd className="font-medium text-foreground">{summary.adminInfo.role}</dd>
              </div>
              <div className="flex justify-between rounded-md border p-2">
                <dt>Email verified</dt>
                <dd className="font-medium text-foreground">
                  {summary.adminInfo.email_verified ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 rounded-md border p-3 text-muted-foreground/80">
              No admin profile found. Seed the admin user to populate this section.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
