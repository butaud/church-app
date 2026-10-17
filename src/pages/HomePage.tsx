import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { formatDateLong } from "../lib/sundays";
import { formatTimeLabel } from "../lib/time";
import { PrayerList } from "./PrayerList";
import { usePageTitle } from "../lib/usePageTitle";

export function HomePage({ isAdmin }: { isAdmin: boolean }) {
  usePageTitle("App");
  const volunteerSignups = useQuery(api.volunteering.listMyUpcomingSignups);
  const feastSignups = useQuery(api.feasts.listMyUpcomingSignups);

  const mySignups =
    volunteerSignups === undefined || feastSignups === undefined
      ? undefined
      : [
          ...volunteerSignups.map((s) => ({ kind: "volunteer" as const, ...s })),
          ...feastSignups.map((s) => ({ kind: "feast" as const, ...s })),
        ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Your upcoming signups
        </h2>
        {mySignups === undefined ? null : mySignups.length === 0 ? (
          <p className="text-sm text-gray-500">
            You have no upcoming volunteering or feast signups.
          </p>
        ) : (
          <ul className="space-y-1">
            {mySignups.map((s) =>
              s.kind === "volunteer" ? (
                <li key={s._id}>
                  <Link
                    to={`/volunteering?month=${s.date.slice(0, 7)}`}
                    className="block rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">{s.jobTypeName}</span> —{" "}
                    {formatDateLong(s.date)}
                  </Link>
                </li>
              ) : (
                <li key={s._id}>
                  <Link
                    to={`/feasts/${s.eventId}`}
                    className="block rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">
                      {s.slotName}
                      {s.quantity > 1 && ` (×${s.quantity})`}
                    </span>{" "}
                    for {s.eventTitle} — {formatDateLong(s.date)}
                    {s.time && ` at ${formatTimeLabel(s.time)}`}
                  </Link>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          What we are praying for
        </h2>
        <PrayerList isAdmin={isAdmin} />
      </section>
    </div>
  );
}
