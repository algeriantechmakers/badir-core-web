"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { removeUser } from "@/actions/admin";

interface RemoveUserDialogProps {
  userId: string;
  userName: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function RemoveUserDialog({
  userId,
  userName,
  trigger,
  onSuccess,
}: RemoveUserDialogProps) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`حذف المستخدم - ${userName}`}
      description="سيتم جدولة حذف الحساب نهائياً بعد 24 ساعة، ويمكن الاعتراض خلال هذه المهلة."
      confirmLabel="حذف"
      destructive
      requireConfirmation
      onConfirm={async (message) => {
        const result = await removeUser(userId, message);
        if (!result.success) {
          throw new Error(result.error || "تعذر حذف المستخدم");
        }
        onSuccess?.();
      }}
    />
  );
}
