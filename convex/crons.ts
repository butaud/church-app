import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "saturday volunteer reminders",
  { minuteUTC: 0 },
  internal.email.sendSaturdayReminders,
);

export default crons;
