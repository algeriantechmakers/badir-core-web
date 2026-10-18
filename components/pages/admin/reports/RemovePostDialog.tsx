"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { removePost } from "@/actions/admin";

export default function RemovePostDialog({
  postId,
  postTitle,
  trigger,
  onSuccess,
}: {
  postId: string;
  postTitle: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`إزالة المنشور - ${postTitle}`}
      description="سيتم حذف المنشور نهائياً وإبلاغ صاحبه."
      confirmLabel="إزالة المنشور"
      destructive
      onConfirm={(message) => removePost(postId, message)}
      onSuccess={onSuccess}
    />
  );
}
