const fs = require("fs");
const { execSync } = require("child_process");

const env = fs.readFileSync(".env.local", "utf8");
const get = (name) => {
  const m = env.match(new RegExp("^" + name + "=(.*)$", "m"));
  return m ? m[1].trim() : null;
};

const vars = {
  CLERK_JWT_ISSUER_DOMAIN: get("CLERK_FRONTEND_API_URL"),
  CLERK_SECRET_KEY: get("CLERK_SECRET_KEY"),
  RESEND_API_KEY: get("RESEND_API_KEY"),
  RESEND_FROM_ADDRESS: get("RESEND_FROM_ADDRESS"),
  APP_URL: "http://localhost:5173",
};

for (const [key, value] of Object.entries(vars)) {
  if (!value) {
    console.error("missing value for", key);
    process.exit(1);
  }
  const quoted = '"' + value.replace(/"/g, '""') + '"';
  execSync(`npx convex env set ${key} ${quoted}`, {
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log("set", key);
}
