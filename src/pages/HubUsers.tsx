import AdminUsers from "./AdminUsers";

// Hub-specific entry point for the Users admin panel without the environmental sidebar layout.
// Reuses the existing AdminUsers component but is mounted under /hub/users.
export default function HubUsers() {
  return <AdminUsers />;
}
