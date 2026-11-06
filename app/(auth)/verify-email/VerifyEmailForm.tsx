"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import AppButton from "@/components/AppButton";

export default function VerifyEmailForm({
  email,
  callbackURL,
}: {
  email: string;
  callbackURL: string;
}) {
  const [isSending, setIsSending] = useState(false);

  const resendVerificationEmail = async () => {
    setIsSending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL,
      });

      if (result.error) {
        toast.error("تعذر إعادة إرسال رابط التحقق. يرجى المحاولة لاحقاً.");
      } else {
        toast.success("تمت إعادة إرسال رابط التحقق إلى بريدك الإلكتروني.");
      }
    } catch {
      toast.error("تعذر إعادة إرسال رابط التحقق. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppButton
      type="submit"
      onClick={resendVerificationEmail}
      disabled={isSending}
      isLoading={isSending}
      border="rounded"
      size="md"
    >
      إعادة إرسال رابط التحقق
    </AppButton>
  );
}
