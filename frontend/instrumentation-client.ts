// Sentry in the browser. https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://33d4b3e100af7ce27d81ede46bab7eb3@o4512378406699008.ingest.de.sentry.io/4512441211551824",
  environment: process.env.NODE_ENV,
  // Only the live site reports; errors from local development would just use up the free quota.
  enabled: process.env.NODE_ENV === "production",
  // No Session Replay: screens show people's meeting notes, and it adds weight to every page.
  // No user details or request bodies either, for the same reason.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
