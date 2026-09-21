import { useEffect, useRef } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { formatDateLong } from "../lib/sundays";
import { formatTimeLabel } from "../lib/time";
import { usePageTitle } from "../lib/usePageTitle";

export function FeastsPage({ isAdmin }: { isAdmin: boolean }) {
  usePageTitle("Feasts");
  const navigate = useNavigate();
  const upcoming = useQuery(api.feasts.listUpcomingEvents);
  const createEvent = useMutation(api.feasts.createEvent);

  const {
    results: pastEvents,
    status: pastStatus,
    loadMore,
  } = usePaginatedQuery(
    api.feasts.listPastEvents,
    {},
    { initialNumItems: 10 },
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && pastStatus === "CanLoadMore") {
        loadMore(10);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pastStatus, loadMore]);

  async function handleCreate() {
    const eventId = await createEvent({
      title: "New Event",
      date: new Date().toISOString().slice(0, 10),
      time: "",
      description: "",
      reminderEnabled: false,
    });
    navigate(`/feasts/${eventId}`, { state: { startEditing: true } });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming feasts and events
          </h2>
          {isAdmin && (
            <button
              onClick={handleCreate}
              className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
            >
              Create event
            </button>
          )}
        </div>
        {upcoming === undefined ? null : upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">
            There are no feasts or events to sign up for at this time.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e._id}>
                <Link
                  to={`/feasts/${e._id}`}
                  className={`block rounded-md border px-3 py-2 text-sm hover:bg-gray-50 ${
                    e.hasSignup
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="font-medium">{e.title}</span>
                  <span className="text-gray-500">
                    {" "}
                    — {formatDateLong(e.date)}
                    {e.time && ` at ${formatTimeLabel(e.time)}`}
                  </span>
                  {e.hasSignup && (
                    <span className="ml-2 text-xs text-gray-500">
                      (you're signed up)
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pastEvents.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            Past events
          </h2>
          <ul className="space-y-2">
            {pastEvents.map((e) => (
              <li key={e._id}>
                <Link
                  to={`/feasts/${e._id}`}
                  className="block rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{e.title}</span>
                  <span className="text-gray-500">
                    {" "}
                    — {formatDateLong(e.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div ref={sentinelRef} className="h-1" />
        </section>
      )}
    </div>
  );
}
