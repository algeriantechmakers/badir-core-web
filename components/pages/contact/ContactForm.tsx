"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ContactFormData,
  contactSchema,
  inquiryTypes,
} from "@/schemas/contactSchema";
import AppButton from "@/components/AppButton";
import FormInput from "@/components/form-input";
import { Loader2 } from "lucide-react";
import emailConfig from "@/lib/email-config";

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      email: "",
      fullName: "",
      title: "",
      inquiryType: inquiryTypes[0],
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "contact",
          to: emailConfig.contactEmail,
          data: {
            fullName: data.fullName,
            email: data.email,
            inquiryType: data.inquiryType,
            title: data.title,
            message: data.message,
            timestamp: new Date().toLocaleString("ar-SA", {
              timeZone: "Asia/Riyadh",
            }),
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("تم إرسال رسالتك بنجاح! سنتواصل معك قريباً");
        reset();
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Email sending error:", error);
      toast.error("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto size-full flex-2/3" dir="rtl">
      <div className="bg-neutrals-50 border-neutrals-300 flex-center-column h-full rounded-3xl border-2 p-6 shadow-sm md:p-8 lg:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-primary-md text-primary-500 mb-4 font-bold">
            تواصل معنا
          </h2>
          <p className="text-neutrals-600 text-secondary-md font-semibold">
            نحن هنا للاستماع إليك ومساعدتك. لا تتردد في التواصل معنا
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* First Row - Name and Email */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Controller
              name="fullName"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  name="fullName"
                  label="الاسم الكامل"
                  placeholder="الاسم الكامل"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.fullName?.message}
                  rtl={true}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="email"
                  name="email"
                  label="البريد الإلكتروني"
                  placeholder="البريد الإلكتروني"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.email?.message}
                  rtl={true}
                />
              )}
            />
          </div>

          {/* Second Row - Inquiry Type and Title */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Controller
              name="inquiryType"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="select"
                  name="inquiryType"
                  label="نوع الاستفسار"
                  placeholder="نوع الاستفسار"
                  value={field.value}
                  onChange={field.onChange}
                  options={inquiryTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  error={errors.inquiryType?.message}
                  rtl={true}
                />
              )}
            />

            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="text"
                  name="title"
                  label="عنوان الرسالة"
                  placeholder="عنوان الرسالة"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.title?.message}
                  rtl={true}
                  rows={3}
                />
              )}
            />
          </div>

          {/* Message */}
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <FormInput
                type="textarea"
                name="message"
                label="الرسالة"
                placeholder="اكتب رسالتك هنا"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.message?.message}
                rows={6}
                rtl={true}
              />
            )}
          />

          {/* Submit Button */}
          <div className="pt-4">
            <AppButton
              type="primary"
              size="lg"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit)}
              className="w-full"
              border="rounded"
              icon={
                isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin md:h-5 md:w-5" />
                ) : null
              }
            >
              {isSubmitting ? "جاري الإرسال..." : "إرســال"}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
}
