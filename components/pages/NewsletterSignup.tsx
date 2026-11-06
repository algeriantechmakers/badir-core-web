"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import AppButton from "@/components/AppButton";
import Link from "next/link";
import { getNewsletterStatus } from "@/actions/newsletter";

export default function NewsletterSignup({
  initialEmail = "",
}: {
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(initialEmail));

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (!initialEmail) {
      setIsLoading(false);
      setIsSubscribed(false);
      return;
    }

    setIsLoading(true);
    getNewsletterStatus()
      .then(({ subscribed }) => setIsSubscribed(subscribed))
      .catch((error) =>
        console.error("Failed to load newsletter status:", error),
      )
      .finally(() => setIsLoading(false));
  }, [initialEmail]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, honeypot }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success("تم تسجيلك في نشرتنا البريدية بنجاح!");
        if (!initialEmail) setEmail("");
      } else if (response.status === 409) {
        toast.info("هذا البريد الإلكتروني مسجّل بالفعل.");
      } else if (response.status === 429) {
        toast.warning(
          result.error || "لقد تجاوزت الحد المسموح به. يرجى المحاولة لاحقاً.",
        );
      } else {
        toast.error("حدث خطأ. يرجى المحاولة لاحقاً.");
      }
    } catch {
      toast.error("حدث خطأ. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loader2 className="text-primary-500 h-5 w-5 animate-spin" />;
  }

  if (initialEmail && isSubscribed) {
    return (
      <div className="text-neutrals-200 space-y-2 text-sm">
        <p>أنت مشترك بالفعل في النشرة البريدية.</p>
        <Link
          href="/profile#newsletter"
          className="text-primary-200 font-semibold hover:underline"
        >
          يمكنك إلغاء الاشتراك من صفحة ملفك الشخصي.
        </Link>
      </div>
    );
  }

  if (initialEmail) {
    return (
      <div className="text-neutrals-200 space-y-2 text-sm">
        <p>يمكنك الاشتراك في النشرة البريدية من صفحة ملفك الشخصي.</p>
        <Link
          href="/profile#newsletter"
          className="text-primary-200 font-semibold hover:underline"
        >
          الانتقال إلى الملف الشخصي
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" dir="rtl">
      <div style={{ display: "none" }} aria-hidden="true">
        <label htmlFor="newsletter-website">الموقع الإلكتروني</label>
        <input
          id="newsletter-website"
          name="website"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input
        type="email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        placeholder="بريدك الإلكتروني"
        className="border-neutrals-300 bg-neutrals-100 text-neutrals-800 placeholder:text-neutrals-500 focus:border-primary-500 h-11 w-full rounded-md border px-3 text-sm outline-none"
        aria-label="البريد الإلكتروني"
      />
      <AppButton
        type="submit"
        border="rounded"
        size="md"
        className="w-full overflow-hidden px-0.5 text-ellipsis whitespace-nowrap"
        disabled={isSubmitting}
        icon={
          isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )
        }
      >
        {isSubmitting ? (
          "جاري الاشتراك..."
        ) : (
          <>
            <span className="md:hidden">اشترك</span>
            <span className="hidden md:inline lg:hidden">اشترك</span>
            <span className="hidden lg:inline">اشترك في النشرة البريدية</span>
          </>
        )}
      </AppButton>
    </form>
  );
}
