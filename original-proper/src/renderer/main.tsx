import "./assets/main.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import SupabaseProvider from "./supabase-provider";
import * as Sentry from "@sentry/electron/renderer";

// Sentry.init({
//   dsn: "https://938a86a3ecee12af6ff6fc65bf63b358@o400583.ingest.us.sentry.io/4507034517176320",
//   // This sets the sample rate to be 10%. You may want this to be 100% while
//   // in development and sample at a lower rate in production
//   replaysSessionSampleRate: 1.0,

//   debug: !window?.api?.isProd(),

//   // If the entire session is not sampled, use the below sample rate to sample
//   // sessions when an error occurs.
//   replaysOnErrorSampleRate: 1.0,

//   integrations: [
//     Sentry.replayIntegration({
//       // Additional SDK configuration goes in here, for example:
//       maskAllText: false,
//       blockAllMedia: true,
//       networkDetailAllowUrls: ["https://interviewsolver.com"],
//     }),
//     Sentry.captureConsoleIntegration({
//       levels: ["error"],
//     }),
//   ],
// });
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* @ts-ignore */}
      <SupabaseProvider>
        <App />
      </SupabaseProvider>
    </ThemeProvider>
  </React.StrictMode>
);
