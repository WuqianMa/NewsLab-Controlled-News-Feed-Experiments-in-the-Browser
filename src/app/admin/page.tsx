import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/admin/ui";
import { expireAbandonedSessions } from "@/lib/sessionLifecycle";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await expireAbandonedSessions();
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const [experiments, participants, completed, events, recentEvents] =
    await Promise.all([
      prisma.experiment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { conditions: true } },
          participants: { where: { isPreview: false }, select: { status: true } },
        },
      }),
      prisma.participant.count({ where: { isPreview: false } }),
      prisma.participant.count({
        where: { isPreview: false, status: "completed" },
      }),
      prisma.event.count(),
      prisma.event.count({ where: { serverReceivedAt: { gte: oneHourAgo } } }),
    ]);

  const stats = [
    { label: "Experiments", value: experiments.length },
    { label: "Participants", value: participants },
    {
      label: "Completion rate",
      value: participants ? `${Math.round((completed / participants) * 100)}%` : "—",
    },
    { label: "Events", value: events },
    { label: "Events (last hour)", value: recentEvents },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-bold text-gray-700">Experiments</h2>
      <div className="mt-2 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Conditions</th>
              <th className="px-4 py-2.5">Participants</th>
              <th className="px-4 py-2.5">Completed</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((e) => (
              <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/experiments/${e.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {e.name}
                  </Link>
                  <span className="ml-2 text-xs text-gray-400">/{e.slug}</span>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={e.status} />
                </td>
                <td className="px-4 py-2.5">{e._count.conditions}</td>
                <td className="px-4 py-2.5">
                  {e.participants.length}
                  {e.targetSampleSize ? ` / ${e.targetSampleSize}` : ""}
                </td>
                <td className="px-4 py-2.5">
                  {e.participants.filter((p) => p.status === "completed").length}
                </td>
              </tr>
            ))}
            {experiments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No experiments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
