"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { ParticipantRole, TargetAudience, UserType } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import FormInput from "@/components/form-input";
import { joinInitiativeAction } from "@/actions/participation";
import { FormFieldType } from "@/schemas";
import AppButton from "@/components/AppButton";

interface InitiativeJoinFormProps {
  initiativeId: string;
  hasForm: boolean;
  formQuestions: FormFieldType[];
  allowedRoles: TargetAudience;
  userType: UserType;
}

interface BaseFormData {
  role: ParticipantRole;
}

// form type with question fields
type JoinFormData = BaseFormData & Record<string, string | string[]>;

export default function InitiativeJoinForm({
  initiativeId,
  hasForm,
  formQuestions,
  allowedRoles,
  userType,
}: InitiativeJoinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinFormData>({
    defaultValues: {
      role: ParticipantRole.participant,
      ...formQuestions.reduce(
        (acc, q) => {
          acc[q.id] = q.type === "checkbox" ? [] : "";
          return acc;
        },
        {} as Record<string, string | string[]>,
      ),
    },
  });

  const getAvailableRoles = () => {
    if (userType === UserType.organization) {
      switch (allowedRoles) {
        case TargetAudience.helpers:
          return [{ value: ParticipantRole.helper, label: "متطوع" }];
        case TargetAudience.participants:
          return [{ value: ParticipantRole.participant, label: "مشارك" }];
        default:
          return [
            { value: ParticipantRole.participant, label: "مشارك" },
            { value: ParticipantRole.helper, label: "متطوع" },
          ];
      }
    }

    // for individual users, match userType with allowed roles
    if (allowedRoles === TargetAudience.helpers) {
      return userType === UserType.helper || userType === UserType.both
        ? [{ value: ParticipantRole.helper, label: "متطوع" }]
        : [];
    }

    if (allowedRoles === TargetAudience.participants) {
      return userType === UserType.participant || userType === UserType.both
        ? [{ value: ParticipantRole.participant, label: "مشارك" }]
        : [];
    }

    // allowedRoles is TargetAudience.both
    if (userType === UserType.helper) {
      return [{ value: ParticipantRole.helper, label: "متطوع" }];
    }

    if (userType === UserType.participant) {
      return [{ value: ParticipantRole.participant, label: "مشارك" }];
    }

    return [
      { value: ParticipantRole.participant, label: "مشارك" },
      { value: ParticipantRole.helper, label: "متطوع" },
    ];
  };

  const onSubmit = async (data: any) => {
    try {
      const formResponses = hasForm
        ? formQuestions.reduce(
            (acc, q) => {
              if (data[q.id] !== undefined && data[q.id] !== "") {
                acc[q.id] = data[q.id];
              }
              return acc;
            },
            {} as Record<string, string | string[]>,
          )
        : undefined;

      startTransition(async () => {
        const result = await joinInitiativeAction({
          initiativeId,
          role: data.role,
          formResponses,
        });

        if (result.success) {
          toast.success(result.message || "تم الانضمام بنجاح");
          router.refresh();
        } else {
          toast.error(result.error || "حدث خطأ أثناء الانضمام");
        }
      });
    } catch {
      toast.error("حدث خطأ غير متوقع");
    }
  };

  const onError = () => {
    toast.error("يرجى التحقق من جميع الحقول المطلوبة");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
      {/* Role Selection */}
      <div className="border-neutrals-300 rounded-lg border bg-white p-4 shadow-xs">
        <Controller
          name="role"
          control={control}
          rules={{ required: "اختر دورك في المبادرة" }}
          render={({ field }) => (
            <FormInput
              type="radio"
              label="دورك في المبادرة"
              name="role"
              value={field.value}
              onChange={field.onChange}
              options={getAvailableRoles()}
              error={errors.role?.message as string}
            />
          )}
        />
      </div>

      {/* Custom Form Questions */}
      {hasForm && formQuestions.length > 0 && (
        <div className="border-neutrals-300 rounded-lg border bg-white p-4 shadow-xs">
          <h3 className="text-neutrals-700 mb-4 text-lg font-medium">
            أسئلة المشاركة
          </h3>

          <div className="space-y-4">
            {formQuestions.map((question) => (
              <div key={question.id} className="bg-neutrals-100 rounded-lg p-3">
                <Controller
                  name={question.id as keyof JoinFormData}
                  control={control}
                  rules={
                    question.required ? { required: "هذا الحقل مطلوب" } : {}
                  }
                  render={({ field }) => (
                    <FormInput
                      type={
                        question.type === "checkbox"
                          ? "checkbox-group"
                          : question.type === "radio"
                            ? "radio"
                            : "text"
                      }
                      label={question.question}
                      name={question.id}
                      value={field.value}
                      onChange={field.onChange}
                      options={question.options?.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                      error={errors[question.id]?.message as string}
                      isOptional={!question.required}
                    />
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <AppButton
        type="submit"
        disabled={isPending}
        className="w-full"
        border="square"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            جاري الإرسال...
          </>
        ) : (
          "انضمام للمبادرة"
        )}
      </AppButton>
    </form>
  );
}
