import emailConfig from "@/lib/email-config";
import { Mail, MapPin } from "lucide-react";

export default function ContactInfo() {
  return (
    <div className="mx-auto size-full flex-1/3" dir="rtl">
      <div className="bg-neutrals-50 border-neutrals-300 flex-center-column h-full rounded-3xl border-2 p-6 shadow-sm md:p-8 lg:p-10">
        {/* Header */}
        <div className="mb-8 text-right">
          <h2 className="text-primary-sm text-primary-500 mb-4 font-bold">
            معلومات التواصل
          </h2>
          <p className="text-neutrals-600 text-secondary-sm font-semibold">
            يمكنك التواصل معنا من خلال الطرق التالية
          </p>
        </div>

        {/* Contact Items */}
        <div className="space-y-8">
          {/* Email */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="bg-primary-100 flex h-12 w-12 items-center justify-center rounded-full md:h-14 md:w-14">
                <Mail className="text-primary-500 h-6 w-6 md:h-7 md:w-7" />
              </div>
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-paragraph-lg text-neutrals-700 mb-2 font-semibold">
                البريد الإلكتروني
              </h3>
              <a
                href={`mailto:${emailConfig.contactEmail}`}
                className="text-primary-500 text-paragraph-md hover:text-primary-600 font-medium underline decoration-2 underline-offset-4 transition-colors"
              >
                {emailConfig.contactEmail}
              </a>
              <p className="text-neutrals-500 text-paragraph-md mt-1">
                راسلنا في أي وقت
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="bg-primary-100 flex h-12 w-12 items-center justify-center rounded-full md:h-14 md:w-14">
                <MapPin className="text-primary-500 h-6 w-6 md:h-7 md:w-7" />
              </div>
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-paragraph-lg text-neutrals-700 mb-2 font-semibold">
                العنوان
              </h3>
              <p className="text-neutrals-700 text-paragraph-md font-medium">
                الجزائر العاصمة - الجزائر
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
