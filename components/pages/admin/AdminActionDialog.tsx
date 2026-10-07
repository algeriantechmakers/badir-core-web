"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import FormInput from "@/components/form-input/FormInput";
import AppButton from "@/components/AppButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminActionDialogProps {
  trigger: React.ReactNode;
  title: string;
  optionalMessage?: boolean;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  requireConfirmation?: boolean;
  onConfirm: (message: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Reusable admin moderation dialog with a required bilingual admin message.
 */
export default function AdminActionDialog({
  trigger,
  title,
  optionalMessage = false,
  description,
  confirmLabel,
  destructive = false,
  requireConfirmation = false,
  onConfirm,
  isLoading = false,
}: AdminActionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loading = isLoading || submitting;
  const canSubmit =
    optionalMessage ||
    (message.trim().length > 0 && (!requireConfirmation || confirmed));

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setMessage("");
      setConfirmed(false);
    }
  };

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("يرجى إدخال رسالة الإدارة وتأكيد الإجراء عند الحاجة");
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(message);
      setOpen(false);
      setMessage("");
      setConfirmed(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "حدث خطأ أثناء تنفيذ الإجراء",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger as React.ReactElement}></DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput
            type="textarea"
            name="adminMessage"
            label="رسالة الإدارة"
            placeholder="اكتب رسالة واضحة للمالك..."
            value={message}
            onChange={(value) => setMessage(String(value))}
            rows={4}
            disabled={loading}
            isOptional={optionalMessage}
          />

          {requireConfirmation && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="admin-action-confirmation"
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(Boolean(value))}
                disabled={loading}
              />
              <label
                htmlFor="admin-action-confirmation"
                className="cursor-pointer text-sm text-gray-700"
              >
                أفهم عواقب هذا الإجراء
              </label>
            </div>
          )}

          <DialogFooter>
            <AppButton
              type="outline"
              border="default"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              إلغاء
            </AppButton>
            <AppButton
              type="submit"
              border="default"
              disabled={!canSubmit || loading}
              isLoading={loading}
              className={cn(
                destructive &&
                  "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
              )}
              dir="rtl"
            >
              {confirmLabel}
            </AppButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
