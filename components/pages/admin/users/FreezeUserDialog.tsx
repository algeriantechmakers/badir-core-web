"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { freezeUser, unfreezeUser } from "@/actions/admin";

interface FreezeUserDialogProps {
  userId: string;
  userName: string;
  trigger: React.ReactNode;
  isFrozen?: boolean;
  onSuccess?: () => void;
}

export default function FreezeUserDialog({
  userId,
  userName,
  trigger,
  isFrozen = false,
  onSuccess,
}: FreezeUserDialogProps) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`${isFrozen ? "إلغاء تجميد الحساب" : "تجميد الحساب"} - ${userName}`}
      description={
        isFrozen
          ? "سيتم إعادة تفعيل حساب المستخدم."
          : "سيتم تعطيل الحساب وإبطال جلسات الدخول وإرسال إشعار إلى المستخدم."
      }
      confirmLabel={isFrozen ? "إلغاء التجميد" : "تجميد"}
      onConfirm={async (message) => {
        const result = isFrozen
          ? await unfreezeUser(userId, message)
          : await freezeUser(userId, message);
        if (!result.success) {
          throw new Error(result.error || "تعذر تنفيذ الإجراء");
        }
        onSuccess?.();
      }}
    />
  );
}
