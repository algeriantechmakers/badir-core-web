"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { restoreUser } from "@/actions/admin";

interface RestoreUserDialogProps {
  userId: string;
  userName: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function RestoreUserDialog({
  userId,
  userName,
  trigger,
  onSuccess,
}: RestoreUserDialogProps) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`استعادة الحساب - ${userName}`}
      description="سيتم إلغاء جدولة حذف الحساب وإعادة تفعيل الحساب والمنظمة المرتبطة به."
      confirmLabel="استعادة"
      optionalMessage
      onConfirm={() => restoreUser(userId)}
      onSuccess={onSuccess}
    />
  );
}
