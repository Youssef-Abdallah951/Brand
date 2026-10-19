/** Install of a real analytics provider (GA4/Metrical/Umami) is DISABLED
 *  until VITE_ANALYTICS_ID is set in the deployment env — by default every
 *  call below is a no-op so no third-party script, cookie or network call
 *  ever ships to customers.
 */

const ID = import.meta.env.VITE_ANALYTICS_ID as string | undefined;
const enabled = typeof ID === "string" && ID.length > 0;
// Set to "1" (dev only) to see event logs without a real provider.
const debug = import.meta.env.VITE_ANALYTICS_DEBUG === "1";

function log(...rest: unknown[]) {
  if (debug) console.info("[analytics]", ...rest);
}

export function trackPage(path: string) {
  log("pageview", path);
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  log(name, props ?? {});
}

export const analyticsEnabled = enabled;
