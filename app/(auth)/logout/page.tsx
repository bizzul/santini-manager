import { logout } from "@/app/(auth)/login/actions";

export default async function LogoutPage() {
  await logout();
  // This page will never actually render because logout() redirects
  return null;
}
