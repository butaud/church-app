import { internalMutation } from "./_generated/server";

const DEFAULT_JOB_TYPES = [
  { name: "Setup", capacity: 2 },
  { name: "Cleanup", capacity: 2 },
  { name: "Snacks", capacity: 2 },
  { name: "Communion", capacity: 1 },
];

export const seedJobTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("jobTypes").collect();
    if (existing.length > 0) {
      console.log("Job types already exist, skipping seed");
      return;
    }
    for (let i = 0; i < DEFAULT_JOB_TYPES.length; i++) {
      await ctx.db.insert("jobTypes", {
        ...DEFAULT_JOB_TYPES[i],
        sortOrder: i,
      });
    }
  },
});
