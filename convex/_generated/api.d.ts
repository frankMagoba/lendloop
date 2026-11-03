/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as automation from "../automation.js";
import type * as http from "../http.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_log from "../lib/log.js";
import type * as lib_signature from "../lib/signature.js";
import type * as lib_validators from "../lib/validators.js";
import type * as loans from "../loans.js";
import type * as model_audit from "../model/audit.js";
import type * as model_loans from "../model/loans.js";
import type * as model_tools from "../model/tools.js";
import type * as notifications from "../notifications.js";
import type * as seed from "../seed.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  automation: typeof automation;
  http: typeof http;
  "lib/dates": typeof lib_dates;
  "lib/functions": typeof lib_functions;
  "lib/log": typeof lib_log;
  "lib/signature": typeof lib_signature;
  "lib/validators": typeof lib_validators;
  loans: typeof loans;
  "model/audit": typeof model_audit;
  "model/loans": typeof model_loans;
  "model/tools": typeof model_tools;
  notifications: typeof notifications;
  seed: typeof seed;
  tools: typeof tools;
  users: typeof users;
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
