import { auth, Session } from "@/lib/auth";
import { UserType } from "@prisma/client";
import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";

/**
 * Get the session on server side and check if the user profile is complete
 * @returns the session if exists, otherwise redirects to complete profile page if profile is incomplete
 */
const getSessionWithCheckProfile: () => Promise<Session | null> = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user.emailVerified === false) {
    redirect("/verify-email", RedirectType.replace);
  }

  if (session && !session.user.profileCompleted) {
    if (session.user.userType === UserType.organization) {
      redirect("/complete-profile/organization", RedirectType.replace);
    } else {
      redirect("/complete-profile/user", RedirectType.replace);
    }
  }
  return session;
};

export default getSessionWithCheckProfile;
