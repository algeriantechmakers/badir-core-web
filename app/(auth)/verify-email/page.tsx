import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AUTHORIZED_REDIRECTION } from "@/data/routes";
import VerifyEmailForm from "./VerifyEmailForm";

export default async function VerifyEmailPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const callbackURL = session.user.profileCompleted
    ? AUTHORIZED_REDIRECTION
    : session.user.userType === "organization"
      ? "/complete-profile/organization"
      : "/complete-profile/user";

  if (session.user.emailVerified) {
    redirect(callbackURL);
  }

  return (
    <main
      className="bg-primary-600 flex min-h-screen items-center justify-center p-4"
      dir="rtl"
    >
      <section className="bg-neutrals-100 flex w-full max-w-lg flex-col items-center gap-6 rounded-xl p-8 text-center shadow-xl">
        <h1 className="text-primary-600 text-2xl font-bold">
          تحقق من بريدك الإلكتروني
        </h1>
        <p className="text-neutrals-700">
          تحقق من بريدك الإلكتروني وانقر على رابط التحقق للمتابعة.
        </p>
        <VerifyEmailForm email={session.user.email} callbackURL={callbackURL} />
      </section>
    </main>
  );
}
