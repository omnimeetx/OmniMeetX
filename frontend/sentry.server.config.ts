// Sentry on the server (page rendering). https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://33d4b3e100af7ce27d81ede46bab7eb3@o4512378406699008.ingest.de.sentry.io/4512441211551824",
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // Requests carry meeting text: never send user details or bodies.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
