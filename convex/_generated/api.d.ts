/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clerkWebhook from "../clerkWebhook.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as feastEmail from "../feastEmail.js";
import type * as feasts from "../feasts.js";
import type * as http from "../http.js";
import type * as model_auth from "../model/auth.js";
import type * as model_resend from "../model/resend.js";
import type * as model_time from "../model/time.js";
import type * as prayers from "../prayers.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as volunteering from "../volunteering.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clerkWebhook: typeof clerkWebhook;
  crons: typeof crons;
  email: typeof email;
  feastEmail: typeof feastEmail;
  feasts: typeof feasts;
  http: typeof http;
  "model/auth": typeof model_auth;
  "model/resend": typeof model_resend;
  "model/time": typeof model_time;
  prayers: typeof prayers;
  seed: typeof seed;
  users: typeof users;
  volunteering: typeof volunteering;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
