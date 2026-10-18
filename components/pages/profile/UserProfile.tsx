"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import FormInput from "@/components/form-input";
import { UserProfile } from "@/schemas/userProfileSchema";
import { handleFileUpload, mimeTypeToExtension } from "@/lib/utils";
import { BUCKET_MIME_TYPES, BUCKET_SIZE_LIMITS } from "@/types/Statics";
import { educationalLevelOptions } from "@/schemas";
import { sexOptions } from "@/schemas/signupUserSchema";
import { toast } from "sonner";
import {
  Calendar,
  Edit2Icon,
  Loader2,
  Mail,
  MapPin,
  Save,
  User,
} from "lucide-react";
import AppButton from "@/components/AppButton";
import {
  uploadUserProfileImage,
  deleteUserProfileImage,
} from "@/actions/helpers-sf";
import { getUserImage, updateUserProfileAction } from "@/actions/user-profile";
import { isEqual } from "lodash";
import { countryList } from "@/data/statics";
import ImageManager from "@/components/ImageManager";
import { useRouter } from "next/navigation";

interface UserProfileFormProps {
  defaultValues: Partial<UserProfile> & {
    createdAt?: Date | string;
    scheduledDeletionAt?: Date | string | null;
  };
}

export default function UserProfileForm({
  defaultValues,
}: UserProfileFormProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const disabled = !isUpdating;
  const [isPending, startTransition] = useTransition();

  const [userImage, setUserImage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    clearErrors,
    setError,
  } = useForm<UserProfile>({
    // resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      ...defaultValues,
      sex: defaultValues.sex ?? "unspecified",
    },
  });

  const router = useRouter();

  const handleUploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadUserProfileImage(formData);
    if (result.success) {
      toast.success("تم تحديث الصورة بنجاح");
      router.refresh();
      const newImg = await getUserImage();
      if (newImg) setUserImage(newImg);
      window.dispatchEvent(new Event("profile-image-updated"));
    } else {
      toast.error(result.error || "حدث خطأ أثناء رفع الصورة");
    }
  };

  const handleDeleteImage = async () => {
    const result = await deleteUserProfileImage();
    if (result.success) {
      toast.success("تم حذف الصورة بنجاح");
      setUserImage(null);
      router.refresh();
      window.dispatchEvent(new Event("profile-image-updated"));
    } else {
      toast.error(result.error || "حدث خطأ أثناء حذف الصورة");
    }
  };

  const handleFormSubmit = async (data: UserProfile) => {
    try {
      const formData = { ...data };
      const originalData = { ...defaultValues };

      const hasFieldChanges = !isEqual(formData, originalData);
      if (!hasFieldChanges) {
        toast.warning("لم يتم إجراء أي تغييرات للحفظ");
        setIsUpdating(false);
        return;
      }

      startTransition(async () => {
        const result = await updateUserProfileAction(data);

        if (result.success) {
          toast.success(result.message || "تم حفظ التغييرات بنجاح");
          setIsUpdating(false);
        } else {
          if (result.errors) {
            // Handle field errors
            Object.entries(result.errors).forEach(([field, messages]) => {
              setError(field as keyof UserProfile, {
                message: Array.isArray(messages)
                  ? messages[0]
                  : (messages as string),
              });
            });
          }
          toast.error(result.error || "فشل في حفظ البيانات");
        }
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const COUNTRIES = useMemo(() => {
    return countryList.sort().map((country) => ({
      value: country.labelEn,
      label: country.label,
    }));
  }, []);

  useEffect(() => {
    const subscription = watch(() => {
      clearErrors();
    });
    return () => subscription.unsubscribe();
  }, [watch, clearErrors]);

  useEffect(() => {
    async function fetchUserImage() {
      const image = await getUserImage();
      if (!image) {
        setUserImage(null);
        return;
      }

      setUserImage(image);
    }

    fetchUserImage();

    return () => {
      setUserImage(null);
    };
  }, []);

  if (isPending)
    return (
      <div className="flex-center min-h-screen w-full justify-center">
        <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <>
      <div className="flex-center mb-4 gap-4">
        <ImageManager
          currentImageUrl={userImage || null}
          onUpload={handleUploadImage}
          onDelete={handleDeleteImage}
          shape="circle"
        />
        <div className="flex-center-column items-start gap-2">
          <h2 className="text-neutrals-700 text-2xl font-bold">
            {defaultValues.firstName || "المستخدم"}{" "}
            {defaultValues.lastName || ""}
          </h2>
          <p className="text-neutrals-500">
            {defaultValues.qualifications?.currentJob || ""}
          </p>
          {defaultValues.scheduledDeletionAt && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
              الحساب مجدول للحذف
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {" "}
        <div className="flex-center mb-6 flex-wrap justify-between gap-4">
          <div className="flex-center flex-1 flex-wrap justify-baseline gap-4">
            <span className="text-caption text-neutrals-500">
              <Calendar className="mx-1 mb-0.5 inline size-5" />
              انضم في:{" "}
              {defaultValues.createdAt
                ? typeof defaultValues.createdAt === "string"
                  ? new Date(defaultValues.createdAt).toLocaleDateString("ar", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : defaultValues.createdAt.toLocaleDateString("ar", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                : ""}
            </span>
            <span className="text-caption text-neutrals-500">
              <MapPin className="mx-1 mb-0.5 inline size-5" />
              {defaultValues.country + " - " + defaultValues.state}
            </span>
            <span className="text-caption text-neutrals-500">
              <Mail className="mx-1 mb-0.5 inline size-5" />
              {defaultValues.email || ""}
            </span>
          </div>
          <div className="flex-center gap-4">
            {isUpdating ? (
              <>
                <AppButton
                  size="sm"
                  type="outline"
                  onClick={() => setIsUpdating(!isUpdating)}
                >
                  إلغاء
                </AppButton>
                <AppButton
                  size="sm"
                  type="submit"
                  icon={
                    isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )
                  }
                >
                  {isPending ? "جاري الحفظ..." : "حفظ"}
                </AppButton>
              </>
            ) : (
              <AppButton
                size="sm"
                type="outline"
                icon={<Edit2Icon className="h-4 w-4" />}
                onClick={() => setIsUpdating(!isUpdating)}
              >
                تعديل
              </AppButton>
            )}
          </div>
        </div>
        {/* Personal Information Section */}
        <div className="bg-neutrals-100 rounded-lg p-6">
          <h3 className="text-neutrals-700 mb-4 text-lg font-semibold">
            المعلومات الأساسية
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* First Name */}
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="الاسم"
                  name="firstName"
                  placeholder="الاسم"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.firstName?.message}
                  disabled={disabled}
                />
              )}
            />

            {/* Last Name */}
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="اللقب"
                  name="lastName"
                  placeholder="اللقب"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.lastName?.message}
                  disabled={disabled}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="البريد الإلكتروني"
                  name="email"
                  placeholder="البريد الإلكتروني"
                  value={defaultValues.email || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.email?.message}
                  disabled
                />
              )}
            />

            <Controller
              name="sex"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormInput
                  type="radio"
                  name="sex"
                  className="md:col-span-2"
                  label="الجنس"
                  placeholder="اختر الجنس"
                  value={value}
                  onChange={onChange}
                  options={sexOptions}
                  error={errors.sex?.message}
                  disabled={disabled}
                />
              )}
            />
            {/* Phone */}
            <div className="flex w-full gap-4">
              <Controller
                name="phoneCountryCode"
                control={control}
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <Controller
                name="phone"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => {
                  const countryCode = watch("phoneCountryCode") || "DZ";

                  return (
                    <FormInput
                      type="tel"
                      name="phone"
                      label="رقم الهاتف"
                      placeholder="5xxxxxxxx"
                      value={value || ""}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={errors.phone?.message}
                      countryCode={countryCode}
                      onCountryChange={(code) =>
                        setValue("phoneCountryCode", code)
                      }
                      isOptional
                      disabled={disabled}
                      className="w-full"
                    />
                  );
                }}
              />
            </div>

            <Controller
              name="bio"
              control={control}
              render={({ field, fieldState }) => {
                return (
                  <FormInput
                    className="col-span-1 md:col-span-2"
                    type="textarea"
                    label="نبذة عني"
                    name={field.name}
                    placeholder="اكتب نبذة عنك"
                    value={field.value || ""}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    rtl={true}
                    isOptional
                    disabled={disabled}
                  />
                );
              }}
            />
          </div>
        </div>
        {/* Location Information */}
        <div className="bg-neutrals-100 rounded-lg p-6">
          <h3 className="text-neutrals-700 mb-4 text-lg font-semibold">
            معلومات السكن
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Country */}
            <Controller
              name="country"
              control={control}
              render={({ field: { onChange, value, onBlur } }) => (
                <FormInput
                  type="select"
                  options={COUNTRIES}
                  name="country"
                  label="البلد"
                  placeholder="الجزائر"
                  value={value || "Algeria"}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors.country?.message}
                  disabled={disabled}
                />
              )}
            />

            {/* State */}
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="الولاية"
                  name="state"
                  placeholder="اختر الولاية"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.state?.message}
                  disabled={disabled}
                />
              )}
            />

            {/* City */}
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="المدينة"
                  name="city"
                  placeholder="المدينة"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.city?.message}
                  isOptional
                  disabled={disabled}
                />
              )}
            />
          </div>
        </div>
        {/* Educational Information */}
        <div className="bg-neutrals-100 rounded-lg p-6">
          <h3 className="text-neutrals-700 mb-4 text-lg font-semibold">
            المعلومات التعليمية والمهنية
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Educational Level */}
            <Controller
              name="qualifications.educationalLevel"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormInput
                  type="radio"
                  name="educationalLevel"
                  className="md:col-span-2"
                  label="المستوى التعليمي"
                  placeholder="اختر المستوى التعليمي"
                  value={value}
                  onChange={onChange}
                  options={educationalLevelOptions}
                  error={errors.qualifications?.educationalLevel?.message}
                  disabled={disabled}
                />
              )}
            />

            <Controller
              name="qualifications.specification"
              control={control}
              render={({ field: { onChange, value, onBlur } }) => (
                <FormInput
                  type="text"
                  name="specification"
                  label="التخصص"
                  placeholder="مثال: هندسة معمارية، طب، تكنولوجيا معلومات"
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors.qualifications?.specification?.message}
                  disabled={disabled}
                />
              )}
            />

            {/* Current Job */}
            <Controller
              name="qualifications.currentJob"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="الوظيفة الحالية"
                  name="currentJob"
                  placeholder="الوظيفة الحالية"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.qualifications?.currentJob?.message}
                  isOptional
                  disabled={disabled}
                />
              )}
            />
          </div>
        </div>
      </form>
    </>
  );
}
