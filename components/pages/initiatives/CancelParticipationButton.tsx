"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/AppButton";
import { cancelParticipationAction } from "@/actions/participation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CancelParticipationButtonProps {
  initiativeId: string;
}

export default function CancelParticipationButton({
  initiativeId,
}: CancelParticipationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const handleConfirmCancel = () => {
    setIsDialogOpen(false);

    startTransition(async () => {
      const result = await cancelParticipationAction(initiativeId);

      if (result.success) {
        toast.success(result.message || "تم إلغاء المشاركة بنجاح");
        router.refresh();
      } else {
        toast.error(result.error || "حدث خطأ أثناء إلغاء المشاركة");
      }
    });
  };

  return (
    <>
      <AppButton
        type="outline"
        size="sm"
        border="square"
        className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
        onClick={() => setIsDialogOpen(true)}
        disabled={isPending}
      >
        {isPending ? "جاري الإلغاء..." : "إلغاء المشاركة"}
      </AppButton>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary-600 text-xl font-bold">
              تأكيد إلغاء المشاركة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutrals-600 text-base">
              هل أنت متأكد من إلغاء المشاركة في هذه المبادرة؟ لن تتمكن من
              التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              className="border-neutrals-300 text-neutrals-700 hover:bg-neutrals-200 rounded-md border px-4 py-2 font-medium"
              disabled={isPending}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-state-error hover:bg-state-error/90 rounded-md px-4 py-2 font-medium text-white"
              disabled={isPending}
            >
              {isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
