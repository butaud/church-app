import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { renderInlineMarkdown } from "../lib/inlineMarkdown";
import { formatDateLong } from "../lib/sundays";

export function HomePage() {
  const prayerList = useQuery(api.prayers.getPrayerList);
  const mySignups = useQuery(api.volunteering.listMyUpcomingSignups);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Your upcoming signups
        </h2>
        {mySignups === undefined ? null : mySignups.length === 0 ? (
          <p className="text-sm text-gray-500">
            You have no upcoming volunteering signups.
          </p>
        ) : (
          <ul className="space-y-1">
            {mySignups.map((s) => (
              <li
                key={s._id}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-medium">{s.jobTypeName}</span> —{" "}
                {formatDateLong(s.date)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          What we are praying for
        </h2>
        {prayerList === undefined ? null : prayerList.length === 0 ? (
          <p className="text-sm text-gray-500">
            There are no prayer requests posted at this time.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {prayerList.map((item, i) => (
              <li key={i} className="text-sm text-gray-800">
                {renderInlineMarkdown(item)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
