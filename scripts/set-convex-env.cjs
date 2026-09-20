const fs = require("fs");
const { execSync } = require("child_process");

const env = fs.readFileSync(".env.local", "utf8");
const get = (name) => {
  const m = env.match(new RegExp("^" + name + "=(.*)$", "m"));
  return m ? m[1].trim() : null;
};

const isProd = process.argv.includes("--prod");
const flag = isProd ? "--prod" : "";

function setVar(key, value) {
  if (!value) {
    console.error("missing value for", key);
    process.exit(1);
  }
  const quoted = '"' + value.replace(/"/g, '""') + '"';
  execSync(`npx convex env set ${key} ${quoted} ${flag}`, {
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log("set", key, flag || "(dev)");
}

// RESEND_* and APP_URL apply the same way to either deployment (same Resend
// account either way; APP_URL just points at the right host).
setVar("RESEND_API_KEY", get("RESEND_API_KEY"));
setVar("RESEND_FROM_ADDRESS", get("RESEND_FROM_ADDRESS"));
setVar("APP_URL", isProd ? "https://church.butaud.com" : "http://localhost:5173");

if (isProd) {
  console.log(
    "\nNote: CLERK_JWT_ISSUER_DOMAIN was not set by this script for --prod.\n" +
      "Production uses a separate Clerk instance from .env.local's dev keys, so set it\n" +
      "manually to the production instance's Frontend API URL:\n" +
      "  npx convex env set CLERK_JWT_ISSUER_DOMAIN <prod-frontend-api-url> --prod\n",
  );
} else {
  setVar("CLERK_JWT_ISSUER_DOMAIN", get("CLERK_FRONTEND_API_URL"));
}
