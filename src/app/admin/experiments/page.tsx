import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge, btnCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const experiments = await prisma.experiment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { conditions: true } },
      participants: { where: { isPreview: false }, select: { id: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Experiments</h1>
        <Link href="/admin/experiments/new" className={btnCls}>
          New experiment
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Conditions</th>
              <th className="px-4 py-2.5">Participants</th>
              <th className="px-4 py-2.5">Created</th>
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
                <td className="px-4 py-2.5 text-gray-500">
                  {e.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {experiments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No experiments yet — create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
