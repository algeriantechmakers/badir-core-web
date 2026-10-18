"use client";

import { useState } from "react";
import Link from "next/link";
import { ReportReason, ReportTarget } from "@prisma/client";
import { toast } from "sonner";
import { createReport } from "@/actions/admin";
import FormInput from "@/components/form-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AppButton from "./AppButton";
import { REPORT_REASONS } from "@/types/Statics";

/** User-facing dialog for submitting a report about a platform target. */
export default function ReportDialog({
  targetType,
  targetId,
  trigger,
}: {
  targetType: ReportTarget;
  targetId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(
    ReportReason.HARMFUL_CONTENT,
  );
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await createReport({
        targetType,
        targetId,
        reason,
        customReason: reason === ReportReason.OTHER ? customReason : undefined,
      });
      if (result.actionTaken) {
        setOpen(false);
        setCustomReason("");
        toast.success("تم إرسال البلاغ بنجاح");
      } else if (result.error === "DUPLICATE_REPORT") {
        toast.error("لقد أبلغت عن هذا المحتوى مسبقاً وهو قيد المراجعة");
      } else if (result.error === "يجب تسجيل الدخول") {
        setRequiresLogin(true);
      } else {
        toast.error(result.error || "تعذر إرسال البلاغ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>الإبلاغ عن محتوى</DialogTitle>
          <DialogDescription>
            اختر سبب البلاغ، وسيتم مراجعته من فريق بادر.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FormInput
            type="radio"
            name="report-reason"
            label="سبب البلاغ"
            value={reason}
            options={REPORT_REASONS}
            onChange={(value) => setReason(value as ReportReason)}
            disabled={submitting}
            rtl
          />
          {reason === ReportReason.OTHER && (
            <FormInput
              type="textarea"
              name="custom-reason"
              label="سبب آخر"
              placeholder="اكتب سبب البلاغ"
              value={customReason}
              onChange={(value) => setCustomReason(String(value))}
              disabled={submitting}
              rows={4}
              rtl
            />
          )}
        </div>
        <DialogFooter>
          <AppButton
            type="outline"
            border="square"
            onClick={() => setOpen(false)}
          >
            إلغاء
          </AppButton>
          <AppButton
            type="primary"
            border="square"
            onClick={submit}
            disabled={
              submitting ||
              (reason === ReportReason.OTHER && !customReason.trim())
            }
          >
            {submitting ? "جاري الإرسال..." : "إرسال البلاغ"}
          </AppButton>
        </DialogFooter>
        {requiresLogin && (
          <p className="text-muted-foreground text-center text-xs">
            يجب{" "}
            <Link className="underline" href="/login">
              تسجيل الدخول
            </Link>{" "}
            لإرسال البلاغ.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
