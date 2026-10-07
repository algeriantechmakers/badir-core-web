import { OrganizationService } from "@/services/organizations";
import { InitiativeService } from "@/services/initiatives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Mail,
  MapPin,
  Building,
  Users,
  Briefcase,
  Home,
  Lock,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import OrgInitiative from "@/components/pages/OrgInitiative";
import { workAreaOptions } from "@/types/Profile";
import { cn, getTranslatedCountryName } from "@/lib/utils";
import getSessionWithCheckProfile from "@/hooks/getSessionWithCheckProfile";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = await params;
  const org = await OrganizationService.getOrganizationById(id);

  if (!org) {
    return {
      title: "المنظمة غير موجودة",
    };
  }

  return {
    title: `${org.name} - بادر`,
    description: org.description || `الملف التعريفي لمنظمة ${org.name}`,
  };
}

export default async function OrganizationProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const orgData = await OrganizationService.getOrganizationById(id);

  if (!orgData) {
    notFound();
  }

  const session = await getSessionWithCheckProfile();
  const isOwner = session?.user?.id === orgData.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isApproved =
    orgData.status === "approved" || orgData.status === "FROZEN";

  // Only show to approved organizations, the owner, or admins
  if (!isApproved && !isOwner && !isAdmin) {
    notFound();
  }

  const initiatives =
    await InitiativeService.getOrgInitiativesWithAvgRating(id);

  return (
    <div className="bg-neutrals-100 min-h-screen p-6" dir="rtl">
      <div className="border-neutrals-300 mx-auto max-w-5xl rounded-lg border-2 bg-white p-6 shadow-sm">
        <div className="flex-center mb-8 gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={orgData.logo || ""} alt={orgData.name} />
            <AvatarFallback className="border-primary-500 text-primary-500 border-2 font-semibold">
              <Building className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-center-column items-start gap-2">
            <h1 className="text-neutrals-700 space-y-2 space-x-1 text-2xl font-bold">
              {orgData.name}
              {orgData.shortName && ` (${orgData.shortName})`}
              <span
                className={`text-caption inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${
                  orgData.officialLicense
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {orgData.officialLicense ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {orgData.officialLicense ? "منظمة مرخصة" : "غير مرخصة"}
              </span>
              {orgData.status === "FROZEN" && (
                <span
                  className={
                    "text-caption inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-500"
                  }
                >
                  <Lock className="h-4 w-4" />
                  منظمة مجمدة
                </span>
              )}
            </h1>
            <p className="text-neutrals-500">{orgData.organizationType}</p>
          </div>
        </div>

        <div className="flex-center mb-6 flex-wrap justify-between gap-4">
          <div className="flex-center flex-1 flex-wrap justify-baseline gap-4">
            {orgData.foundingDate && (
              <span className="text-caption text-neutrals-500">
                <Calendar className="mx-1 mb-0.5 inline size-5" />
                تأسست في:{" "}
                {new Date(orgData.foundingDate).toLocaleDateString("ar", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            <span className="text-caption text-neutrals-500">
              <MapPin className="mx-1 mb-0.5 inline size-5" />
              {getTranslatedCountryName(orgData.country)} - {orgData.state}
              {orgData.city ? ` - ${orgData.city}` : ""}
            </span>
            <span className="text-caption text-neutrals-500">
              <Mail className="mx-1 mb-0.5 inline size-5" />
              {orgData.contactEmail}
            </span>

            <span className="text-caption text-neutrals-500">
              <Users className="mx-1 mb-0.5 inline size-5" />
              {orgData.membersCount || 0} عضو
            </span>
          </div>
        </div>

        <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
          <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
            عن المنظمة
          </h2>
          <p className="text-neutrals-600">
            {orgData.description || "لا يوجد وصف للمنظمة."}
          </p>
        </div>

        <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
          <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
            مجالات العمل
          </h2>

          <div className="flex flex-wrap gap-2">
            {orgData.workAreas && orgData.workAreas.length > 0 ? (
              orgData.workAreas.map((area) => (
                <span
                  key={area}
                  className="bg-primary-100 text-primary-700 rounded-full px-3 py-1 text-sm"
                >
                  {workAreaOptions.find((opt) => opt.value === area)?.label ||
                    area}
                </span>
              ))
            ) : (
              <p className="text-neutrals-500">لا توجد مجالات عمل محددة</p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
          <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
            معلومات الاتصال
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex gap-3">
              <Mail className="text-primary-600 h-5 w-5" />
              <div>
                <p className="text-neutrals-500 text-sm">البريد الإلكتروني</p>
                <p className="text-neutrals-700 font-medium break-all">
                  {orgData.contactEmail}
                </p>
              </div>
            </div>

            {orgData.contactPhone && (
              <div className="flex gap-3">
                <Briefcase className="text-primary-600 h-5 w-5" />
                <div>
                  <p className="text-neutrals-500 text-sm">رقم الهاتف</p>
                  <p dir="ltr" className="text-neutrals-700 font-medium">
                    {orgData.contactPhone}
                  </p>
                </div>
              </div>
            )}

            {orgData.headquarters && (
              <div className="col-span-1 flex gap-3 md:col-span-2">
                <Home className="text-primary-600 h-5 w-5" />
                <div>
                  <p className="text-neutrals-500 text-sm">المقر الرئيسي</p>
                  <p className="text-neutrals-700 font-medium">
                    {orgData.headquarters}
                  </p>
                  <p className="text-neutrals-700 font-medium wrap-break-word">
                    {[
                      orgData.country &&
                        `${getTranslatedCountryName(orgData.country)}`,
                      orgData.state && `${orgData.state}`,
                      orgData.city && `${orgData.city}`,
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Previous Initiatives */}
        {orgData.previousInitiatives && (
          <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
            <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
              المبادرات السابقة
            </h2>
            <p className="text-neutrals-600">{orgData.previousInitiatives}</p>
          </div>
        )}

        {/* Organization Initiatives */}
        {initiatives.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">المبادرات</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {initiatives.map((initiative) => (
                <OrgInitiative key={initiative.id} initiative={initiative} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
