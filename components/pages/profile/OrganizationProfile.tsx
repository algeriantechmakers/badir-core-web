"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import FormInput from "@/components/form-input";
import { OrganizationProfile } from "@/schemas/organizatioProfieSchema";
import { cn, handleFileUpload, mimeTypeToExtension } from "@/lib/utils";
import { BUCKET_MIME_TYPES, BUCKET_SIZE_LIMITS } from "@/types/Statics";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Edit2Icon,
  Loader2,
  Mail,
  MapPin,
  Save,
  Building,
  Users,
  ExternalLink,
  Lock,
} from "lucide-react";
import AppButton from "@/components/AppButton";
import {
  uploadOrganizationLogo,
  deleteOrganizationLogo,
} from "@/actions/helpers-sf";
import {
  updateOrganizationProfileAction,
  getOrganizationLogo,
} from "@/actions/organization-profile";
import { organizationTypeOptions, workAreaOptions } from "@/types/Profile";
import { isEqual } from "lodash";
import { countryList } from "@/data/statics";
import ImageManager from "@/components/ImageManager";
import { useRouter } from "next/navigation";
import { OrganizationStatus } from "@prisma/client";

interface OrganizationProfileFormProps {
  defaultValues: Partial<OrganizationProfile> & {
    createdAt?: Date | string;
    isVerified?: boolean;
    status: OrganizationStatus;
  };
}

export default function OrganizationProfileForm({
  defaultValues,
}: OrganizationProfileFormProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const disabled = !isUpdating;
  const [isPending, startTransition] = useTransition();
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    clearErrors,
    setError,
  } = useForm<OrganizationProfile>({
    defaultValues: {
      ...defaultValues,
      isLicensed: Boolean(defaultValues.officialLicense),
      // identificationCard: null,
    },
  });

  const isLicensed = watch("isLicensed");
  const isVerified = Boolean(defaultValues.isVerified);

  const handleUploadLogo = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadOrganizationLogo(formData);
    if (result.success) {
      toast.success("تم تحديث الشعار بنجاح");
      router.refresh();
      const newLogo = await getOrganizationLogo();
      if (newLogo) setOrgLogo(newLogo);
      window.dispatchEvent(new Event("profile-image-updated"));
    } else {
      toast.error(result.error || "حدث خطأ أثناء رفع الشعار");
    }
  };

  const handleDeleteLogo = async () => {
    const result = await deleteOrganizationLogo();
    if (result.success) {
      toast.success("تم حذف الشعار بنجاح");
      setOrgLogo(null);
      router.refresh();
      window.dispatchEvent(new Event("profile-image-updated"));
    } else {
      toast.error(result.error || "حدث خطأ أثناء حذف الشعار");
    }
  };

  const handleFormSubmit = async (data: OrganizationProfile) => {
    try {
      const formData = { ...data };
      const originalData = { ...defaultValues };

      delete (formData as Partial<OrganizationProfile>).isLicensed;
      delete originalData.isLicensed;

      const hasFieldChanges = !isEqual(formData, originalData);
      if (!hasFieldChanges) {
        toast.warning("لم يتم إجراء أي تغييرات للحفظ");
        setIsUpdating(false);
        return;
      }

      startTransition(async () => {
        const result = await updateOrganizationProfileAction(data);

        if (result.success) {
          toast.success(result.message || "تم حفظ التغييرات بنجاح");
          setIsUpdating(false);
        } else {
          if (result.errors) {
            // Handle field errors
            Object.entries(result.errors).forEach(([field, messages]) => {
              setError(field as keyof OrganizationProfile, {
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
    async function fetchOrgLogo() {
      const logo = await getOrganizationLogo();
      if (!logo) {
        setOrgLogo(null);
        return;
      }

      setOrgLogo(logo);
    }

    fetchOrgLogo();

    return () => {
      setOrgLogo(null);
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
          currentImageUrl={orgLogo || null}
          onUpload={handleUploadLogo}
          onDelete={handleDeleteLogo}
          shape="circle"
        />
        <div className="flex-center-column items-start gap-2">
          <h2 className="text-neutrals-700 space-y-2 space-x-1 text-2xl font-bold">
            {defaultValues.name || "المنظمة"}
            <span
              className={cn(
                "text-caption inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium",
                isVerified
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700",
              )}
            >
              {isVerified ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isVerified ? "منظمة موثقة" : "غير موثقة"}
            </span>
            {defaultValues.status === "FROZEN" && (
              <span
                className={cn(
                  "text-caption inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium",
                  "bg-blue-100 text-blue-500",
                )}
              >
                <Lock className="h-4 w-4" />
                منظمة مجمدة
              </span>
            )}
          </h2>

          <p className="text-neutrals-500">
            {defaultValues.organizationType || ""}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="flex-center mb-6 flex-wrap justify-between gap-4">
          <div className="flex-center flex-1 flex-wrap justify-baseline gap-4">
            <span className="text-caption text-neutrals-500">
              <Calendar className="mx-1 mb-0.5 inline size-5" />
              تأسست في:{" "}
              {defaultValues.foundingDate
                ? typeof defaultValues.foundingDate === "string"
                  ? new Date(defaultValues.foundingDate).toLocaleDateString(
                      "ar",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : defaultValues.foundingDate.toLocaleDateString("ar", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                : "غير محدد"}
            </span>
            <span className="text-caption text-neutrals-500">
              <MapPin className="mx-1 mb-0.5 inline size-5" />
              {defaultValues.country + " - " + defaultValues.state}
            </span>
            <span className="text-caption text-neutrals-500">
              <Mail className="mx-1 mb-0.5 inline size-5" />
              {defaultValues.contactEmail || ""}
            </span>
            <span className="text-caption text-neutrals-500">
              <Users className="mx-1 mb-0.5 inline size-5" />
              {defaultValues.membersCount
                ? `${defaultValues.membersCount} عضو`
                : ""}
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

        {/* Basic Organization Information */}
        <div className="bg-neutrals-100 rounded-lg p-6">
          <h3 className="text-neutrals-700 mb-4 text-lg font-semibold">
            المعلومات الأساسية
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Organization Name */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="اسم المنظمة"
                  name="name"
                  placeholder="اسم المنظمة"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  disabled={disabled}
                />
              )}
            />

            {/* Organization Short Name */}
            <Controller
              name="shortName"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="الاسم المختصر"
                  name="shortName"
                  placeholder="الاسم المختصر"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.shortName?.message}
                  isOptional
                  disabled={disabled}
                />
              )}
            />

            {/* Organization Type */}
            <Controller
              name="organizationType"
              control={control}
              render={({ field, fieldState }) => (
                <FormInput
                  type="radio"
                  label="نوع المنظمة"
                  name={field.name}
                  options={organizationTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  rtl={true}
                  disabled={disabled}
                />
              )}
            />

            {/* Organization Role */}
            <Controller
              name="userRole"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  label="دورك في المنظمة"
                  name="userRole"
                  placeholder="مثال: رئيس المنظمة، مدير..."
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.userRole?.message}
                  disabled={disabled}
                />
              )}
            />

            {/* Work Areas */}
            <Controller
              name="workAreas"
              control={control}
              render={({ field, fieldState }) => (
                <FormInput
                  type="checkbox-group"
                  label="مجالات العمل"
                  className="md:col-span-2"
                  name={field.name}
                  options={workAreaOptions}
                  value={field.value || []}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  rtl={true}
                  disabled={disabled}
                />
              )}
            />

            {/* Description */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <FormInput
                  className="md:col-span-2"
                  type="textarea"
                  label="وصف المنظمة"
                  name="description"
                  placeholder="اكتب وصفاً مختصراً عن المنظمة"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.description?.message}
                  rtl={true}
                  disabled={disabled}
                />
              )}
            />

            {/* Previous Initiatives */}
            <Controller
              name="previousInitiatives"
              control={control}
              render={({ field }) => (
                <FormInput
                  className="md:col-span-2"
                  type="textarea"
                  label="المبادرات السابقة"
                  name="previousInitiatives"
                  placeholder="اكتب عن المبادرات السابقة التي نظمتها المنظمة"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.previousInitiatives?.message}
                  rtl={true}
                  isOptional
                  disabled={disabled}
                />
              )}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-neutrals-100 rounded-lg p-6">
          <h3 className="text-neutrals-700 mb-4 text-lg font-semibold">
            معلومات الاتصال
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Email */}
            <Controller
              name="contactEmail"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="email"
                  label="البريد الإلكتروني"
                  name="contactEmail"
                  placeholder="البريد الإلكتروني للمنظمة"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.contactEmail?.message}
                  disabled={disabled}
                />
              )}
            />

            {/* Phone */}
            <div className="flex gap-4">
              <Controller
                name="contactPhoneCountryCode"
                control={control}
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <Controller
                name="contactPhone"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => {
                  const countryCode = watch("contactPhoneCountryCode") || "DZ";

                  return (
                    <FormInput
                      type="tel"
                      name="contactPhone"
                      label="رقم الهاتف"
                      placeholder="5xxxxxxxx"
                      value={value || ""}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={errors.contactPhone?.message}
                      countryCode={countryCode}
                      onCountryChange={(code) =>
                        setValue("contactPhoneCountryCode", code)
                      }
                      isOptional
                      disabled={disabled}
                    />
                  );
                }}
              />
            </div>

            {/* Founding Date */}
            <Controller
              name="foundingDate"
              control={control}
              render={({ field, fieldState }) => (
                <FormInput
                  type="date"
                  label="تاريخ التأسيس"
                  name={field.name}
                  placeholder="ي ي / ش ش / س س س س"
                  value={
                    field.value
                      ? new Date(field.value).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(
                      e && typeof e === "string" ? new Date(e) : null,
                    )
                  }
                  error={fieldState.error?.message}
                  rtl={true}
                  disabled={disabled}
                />
              )}
            />

            <Controller
              name="membersCount"
              control={control}
              render={({ field, fieldState }) => (
                <FormInput
                  type="number"
                  label="عدد الأعضاء"
                  name={field.name}
                  placeholder="عدد الأعضاء"
                  value={field.value?.toString() || ""}
                  onChange={(e) => {
                    const val = e ? parseInt(e.toString(), 10) : undefined;
                    field.onChange(
                      val !== undefined && !isNaN(val) ? val : undefined,
                    );
                  }}
                  error={fieldState.error?.message}
                  rtl={true}
                  disabled={disabled}
                />
              )}
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-neutrals-100 rounded-lg p-6">
          <h3 className="text-neutrals-700 mb-4 text-lg font-semibold">
            معلومات الموقع
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
            <Controller
              name="headquarters"
              control={control}
              render={({ field }) => (
                <FormInput
                  className="md:col-span-3"
                  type="text"
                  label="المقر الرئيسي"
                  name="headquarters"
                  placeholder="عنوان المقر الرئيسي"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.headquarters?.message}
                  isOptional
                  disabled={disabled}
                />
              )}
            />
          </div>
        </div>

        {/* Documents */}
        <div className="bg-neutrals-100 rounded-lg p-6">
          <h3 className="text-neutrals-700 mb-4 text-lg font-semibold">
            المستندات والصور
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {/* Official License */}
            <Controller
              name="isLicensed"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="switch"
                  label="هل المنظمة مرخصة أو معتمدة رسميا؟"
                  name={field.name}
                  value={field.value || false}
                  onChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      setValue("officialLicense", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  disabled={disabled}
                />
              )}
            />

            <Controller
              name="officialLicense"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <FormInput
                    type="url"
                    label="رابط الترخيص أو الاعتماد الرسمي"
                    name="officialLicense"
                    placeholder="ضع رابط معاينة موثوق للترخيص"
                    error={errors.officialLicense?.message}
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    rtl={true}
                    isOptional={!isLicensed}
                    disabled={disabled || !isLicensed}
                  />
                  {field.value && (
                    <a
                      href={field.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-400 inline-flex items-center gap-2 text-sm font-medium"
                      dir="rtl"
                    >
                      <ExternalLink className="h-4 w-4" />
                      فتح رابط الترخيص
                    </a>
                  )}
                </div>
              )}
            />

            {/* ID Card */}
            {/* <Controller
              name="identificationCard"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="file"
                  label="بطاقة التعريف"
                  name="identificationCard"
                  placeholder="اختر ملف بطاقة التعريف"
                  error={errors.identificationCard?.message}
                  value={field.value || ""}
                  onChange={field.onChange}
                  rtl={true}
                  fileAccept={BUCKET_MIME_TYPES.documents.map(
                    mimeTypeToExtension
                  )}
                  fileMaxSize={BUCKET_SIZE_LIMITS.documents / 1024 / 1024}
                  onFileChange={(file, onChange) =>
                    handleFileUpload(
                      file,
                      BUCKET_SIZE_LIMITS.documents,
                      (value) => onChange(JSON.stringify(value))
                    )
                  }
                  isOptional
                  disabled={disabled}
                />
              )}
            /> */}
          </div>
        </div>
      </form>
    </>
  );
}
