import AdminAnalytics from "./AdminAnalytics";

// Hub-specific entry point for the Analytics panel without the environmental sidebar layout.
// Reuses the existing AdminAnalytics component but is mounted under /hub/analytics.
export default function HubAnalytics() {
  return <AdminAnalytics />;
}
