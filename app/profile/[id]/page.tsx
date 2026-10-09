import { UserService } from "@/services/user";
import { toPlainUser } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Mail,
  MapPin,
  User,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { ParticipationService } from "@/services/participations";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import InitiativeCard from "@/components/pages/InitiativeCard";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = await params;
  const user = await UserService.getUser(id);

  if (!user) {
    return {
      title: "المستخدم غير موجود",
    };
  }

  return {
    title: `${user.firstName} ${user.lastName} - بادر`,
    description:
      user.bio || `الملف الشخصي لـ ${user.firstName} ${user.lastName}`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const user = await UserService.getUser(id);

  if (!user) {
    notFound();
  }

  const userData = toPlainUser(user, user.qualifications?.[0]);

  const participations = (
    await ParticipationService.getUserParticipations(id)
  ).filter((p) => p.status === "approved");

  return (
    <div className="bg-neutrals-100 min-h-screen p-6" dir="rtl">
      <div className="border-neutrals-300 mx-auto max-w-5xl rounded-lg border-2 bg-white p-6 shadow-sm">
        <div className="flex-center mb-8 gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={userData.image || ""} alt={userData.firstName} />
            <AvatarFallback className="border-primary-500 text-primary-500 border-2 font-semibold">
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-center-column items-start gap-2">
            <h1 className="text-neutrals-700 text-2xl font-bold">
              {userData.firstName} {userData.lastName}
            </h1>
            {!user.isActive && (
              <Badge variant="secondary" className="text-amber-800">
                حساب موقوف
              </Badge>
            )}
            <p className="text-neutrals-500">
              {userData.qualifications?.currentJob || ""}
            </p>
          </div>
        </div>

        <div className="flex-center mb-6 flex-wrap justify-between gap-4">
          <div className="flex-center flex-1 flex-wrap justify-baseline gap-4">
            <span className="text-caption text-neutrals-500">
              <Calendar className="mx-1 mb-0.5 inline size-5" />
              انضم في:{" "}
              {userData.createdAt
                ? new Date(userData.createdAt).toLocaleDateString("ar", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </span>
            <span className="text-caption text-neutrals-500">
              <MapPin className="mx-1 mb-0.5 inline size-5" />
              {userData.country} - {userData.state}
              {userData.city ? ` - ${userData.city}` : ""}
            </span>
            <span className="text-caption text-neutrals-500">
              <Mail className="mx-1 mb-0.5 inline size-5" />
              {userData.email}
            </span>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
          <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
            نبذة عني
          </h2>
          <p className="text-neutrals-600">
            {userData.bio || "المستخدم لم يضف نبذة شخصية بعد."}
          </p>
        </div>

        {/* Sex */}
        {user.sex && (
          <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
            <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
              الجنس
            </h2>
            <p className="text-neutrals-600">
              {userData.sex === "male"
                ? "ذكر"
                : userData.sex === "female"
                  ? "أنثى"
                  : "غير محدد"}
            </p>
          </div>
        )}

        {/* Education and Professional Information */}
        <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
          <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
            المعلومات التعليمية والمهنية
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex gap-3">
              <GraduationCap className="text-primary-600 h-5 w-5" />
              <div>
                <p className="text-neutrals-500 text-sm">المستوى التعليمي</p>
                <p className="text-neutrals-700 font-medium">
                  {userData.qualifications?.educationalLevel || "غير محدد"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Briefcase className="text-primary-600 h-5 w-5" />
              <div>
                <p className="text-neutrals-500 text-sm">التخصص</p>
                <p className="text-neutrals-700 font-medium">
                  {userData.qualifications?.specification || "غير محدد"}
                </p>
              </div>
            </div>

            {userData.qualifications?.currentJob && (
              <div className="col-span-1 flex gap-3 md:col-span-2">
                <Briefcase className="text-primary-600 h-5 w-5" />
                <div>
                  <p className="text-neutrals-500 text-sm">الوظيفة الحالية</p>
                  <p className="text-neutrals-700 font-medium">
                    {userData.qualifications?.currentJob}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Participations */}
        {participations.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">المشاركات</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {participations.map((participation) => (
                <InitiativeCard
                  key={participation.initiative.id}
                  mode="participation"
                  participation={participation}
                  isInspecting={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
