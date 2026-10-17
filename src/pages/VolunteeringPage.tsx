import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  monthLabel,
  sundaysInMonth,
  formatDateShort,
  toDateStr,
  monthParam,
  parseMonthParam,
} from "../lib/sundays";
import { ConfigureJobTypesDialog } from "./ConfigureJobTypesDialog";
import { getErrorMessage } from "../lib/errors";
import { usePageTitle } from "../lib/usePageTitle";
import { PersonPicker } from "../components/PersonPicker";

export function VolunteeringPage({ isAdmin }: { isAdmin: boolean }) {
  usePageTitle("Volunteering");
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const { year, month } = parseMonthParam(searchParams.get("month")) ?? {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth(),
  };
  const [configureOpen, setConfigureOpen] = useState(false);
  const [assigning, setAssigning] = useState<{
    date: string;
    jobTypeId: Id<"jobTypes">;
  } | null>(null);

  const sundays = useMemo(() => sundaysInMonth(year, month), [year, month]);
  const startDate = sundays[0];
  const endDate = sundays[sundays.length - 1];

  const me = useQuery(api.users.getMe);
  const jobTypes = useQuery(api.volunteering.listJobTypes);
  const signups = useQuery(
    api.volunteering.listSignupsForMonth,
    startDate && endDate ? { startDate, endDate } : "skip",
  );
  const allUsers = useQuery(api.users.listUsers, isAdmin ? {} : "skip");
  const allInvites = useQuery(api.users.listInvites, isAdmin ? {} : "skip");

  const signUp = useMutation(api.volunteering.signUp);
  const adminSignUp = useMutation(api.volunteering.adminSignUp);
  const adminAssignInvite = useMutation(api.volunteering.adminAssignInvite);
  const cancelSignup = useMutation(api.volunteering.cancelSignup);

  const myUserId = me?.status === "active" ? me.user._id : null;
  const todayStr = toDateStr(new Date());

  async function handleSignUp(date: string, jobTypeId: Id<"jobTypes">) {
    try {
      await signUp({ date, jobTypeId });
    } catch (err) {
      alert(getErrorMessage(err, "Could not sign up"));
    }
  }

  async function handleAdminAssign(
    date: string,
    jobTypeId: Id<"jobTypes">,
    selection: string,
  ) {
    try {
      if (selection.startsWith("user:")) {
        const userId = selection.slice("user:".length) as Id<"users">;
        await adminSignUp({ date, jobTypeId, userId });
      } else if (selection.startsWith("invite:")) {
        const inviteId = selection.slice("invite:".length) as Id<"invites">;
        await adminAssignInvite({ date, jobTypeId, inviteId });
      }
    } catch (err) {
      alert(getErrorMessage(err, "Could not assign"));
    }
  }

  function goToMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setSearchParams({ month: monthParam(y, m) }, { replace: true });
  }

  const isCurrentMonth =
    year === now.getUTCFullYear() && month === now.getUTCMonth();

  function goToCurrentMonth() {
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToMonth(-1)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          >
            ←
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {monthLabel(year, month)}
          </h2>
          <button
            onClick={() => goToMonth(1)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          >
            →
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToCurrentMonth}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
            >
              This month
            </button>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setConfigureOpen(true)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
          >
            Configure jobs
          </button>
        )}
      </div>

      {jobTypes === undefined || signups === undefined ? null : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-gray-300 bg-gray-50 p-2 text-left font-medium text-gray-600">
                  Date
                </th>
                {jobTypes.map((jt) => (
                  <th
                    key={jt._id}
                    className="border-b border-gray-300 p-2 text-left font-medium text-gray-600"
                  >
                    {jt.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sundays.map((date) => (
                <tr key={date}>
                  <td className="sticky left-0 z-10 border-b border-r border-gray-300 bg-gray-50 p-2 align-top font-medium text-gray-800">
                    {formatDateShort(date)}
                  </td>
                  {jobTypes.map((jt) => {
                    const cellSignups = signups.filter(
                      (s) => s.date === date && s.jobTypeId === jt._id,
                    );
                    const isFull = cellSignups.length >= jt.capacity;
                    const iAmSignedUp = cellSignups.some(
                      (s) => s.userId === myUserId,
                    );
                    const isPast = date < todayStr;
                    return (
                      <td
                        key={jt._id}
                        className="border-b border-gray-300 p-2 align-top"
                      >
                        <div className="space-y-1">
                          {cellSignups.map((s) => (
                            <div
                              key={s._id}
                              className="flex items-center justify-between gap-2 rounded bg-gray-100 px-2 py-1"
                            >
                              <span>
                                {s.userName}
                                {s.isPendingInvite && (
                                  <span className="ml-1 text-gray-400">
                                    (invited)
                                  </span>
                                )}
                              </span>
                              {(s.userId === myUserId || isAdmin) && (
                                <button
                                  onClick={() =>
                                    cancelSignup({ signupId: s._id })
                                  }
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          ))}
                          {!isPast && !isFull && !iAmSignedUp && (
                            <button
                              onClick={() => handleSignUp(date, jt._id)}
                              className="w-full rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Sign up
                            </button>
                          )}
                          {isAdmin && !isPast && !isFull && (
                            <button
                              onClick={() =>
                                setAssigning({ date, jobTypeId: jt._id })
                              }
                              className="w-full rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Assign someone
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {configureOpen && (
        <ConfigureJobTypesDialog onClose={() => setConfigureOpen(false)} />
      )}

      {assigning && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              Assign a volunteer
            </h3>
            <div className="mb-4">
              <PersonPicker
                users={allUsers}
                invites={allInvites}
                value=""
                onChange={async (selection) => {
                  await handleAdminAssign(
                    assigning.date,
                    assigning.jobTypeId,
                    selection,
                  );
                  setAssigning(null);
                }}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setAssigning(null)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
