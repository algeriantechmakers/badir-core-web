"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  Wifi,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import parse from "html-react-parser";
import { formatDate } from "@/lib/utils";
import { InitiativeService } from "@/services/initiatives";
import { sanitize } from "@/lib/santitize-client";

interface InitiativeDetailsProps {
  initiative: NonNullable<
    Awaited<ReturnType<typeof InitiativeService.getById>>
  >;
}

export default function InitiativeDetails({
  initiative,
}: InitiativeDetailsProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [organizerImage, setOrganizerImage] = useState<string | null>(null);

  const organizerName =
    initiative.organizerType === "user"
      ? initiative.organizerUser?.name || "منظم غير معروف"
      : initiative.organizerOrg?.name || "منظمة غير معروفة";

  useEffect(() => {
    function fetchUserImage() {
      if (initiative.organizerType === "user" && initiative.organizerUser) {
        setOrganizerImage(initiative.organizerUser.image || null);
      } else if (initiative.organizerOrg) {
        setOrganizerImage(initiative.organizerOrg.logo || null);
      } else {
        setOrganizerImage(null);
      }
    }

    fetchUserImage();

    return () => {
      setOrganizerImage(null);
    };
  }, [
    initiative.organizerOrg,
    initiative.organizerType,
    initiative.organizerUser,
  ]);

  const organizerProfileLink =
    initiative.organizerType === "user"
      ? `/profile/${initiative.organizerUser?.id}`
      : `/organizations/${initiative.organizerOrg?.id}`;

  if (!initiative) {
    return <div>المبادرة غير موجودة</div>;
  }
  return (
    <>
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-neutrals-700 mb-2 text-xl font-semibold">
          وصف المبادرة
        </h2>
        <div className="text-neutrals-600 prose max-w-none">
          <div className={showFullDescription ? "" : "line-clamp-4"}>
            {parse(sanitize(initiative.descriptionAr))}
          </div>
          {initiative.descriptionAr &&
            initiative.descriptionAr.length > 300 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-primary-600 mt-2 flex items-center font-medium"
              >
                {showFullDescription ? (
                  <>
                    <ChevronUp className="ml-1 h-4 w-4" />
                    عرض أقل
                  </>
                ) : (
                  <>
                    <ChevronDown className="ml-1 h-4 w-4" />
                    عرض المزيد
                  </>
                )}
              </button>
            )}
        </div>
      </div>

      {/* Initiative Meta */}
      <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
        <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
          معلومات المبادرة
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Online/Onsite */}
          <div className="flex gap-3">
            {initiative.isOnline ? (
              <Wifi className="text-primary-600 h-5 w-5" />
            ) : (
              <MapPin className="text-primary-600 h-5 w-5" />
            )}
            <div>
              <p className="text-neutrals-500 text-sm">نوع المبادرة</p>
              <p className="text-neutrals-700 font-medium">
                {initiative.isOnline ? "عن بُعد" : "حضوري"}
              </p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="flex gap-3">
            <Image
              className="text-primary-600 h-5 w-5"
              src="/images/icons/calendar.svg"
              alt="التاريخ"
              width={20}
              height={20}
            />
            <div>
              <p className="text-neutrals-500 text-sm">التاريخ</p>
              <p className="text-neutrals-700 font-medium">
                {formatDate(initiative.startDate)} -{" "}
                {formatDate(initiative.endDate)}
              </p>
            </div>
          </div>

          {/* Registration Deadline */}
          {initiative.registrationDeadline && (
            <div className="flex gap-3">
              <Clock className="text-primary-600 h-5 w-5" />
              <div>
                <p className="text-neutrals-500 text-sm">آخر موعد للتسجيل</p>
                <p className="text-neutrals-700 font-medium">
                  {formatDate(initiative.registrationDeadline)}
                </p>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex gap-3">
            <Image
              className="text-primary-600 h-5 w-5"
              src="/images/icons/map-pin.svg"
              alt="الموقع"
              width={20}
              height={20}
            />
            <div>
              <p className="text-neutrals-500 text-sm">الموقع</p>
              <p className="text-neutrals-700 font-medium">
                {initiative.location}, {initiative.city}
                {initiative.state && `, ${initiative.state}`}
                {initiative.country && `, ${initiative.country}`}
              </p>
            </div>
          </div>

          {/* Participant Count */}
          <div className="flex gap-3">
            <Image
              className="text-primary-600 h-5 w-5"
              src="/images/icons/group-reverse.svg"
              alt="المشاركون"
              width={20}
              height={20}
            />
            <div>
              <p className="text-neutrals-500 text-sm">المشاركون</p>
              <p className="text-neutrals-700 font-medium">
                {initiative.currentParticipants}
                {initiative.maxParticipants
                  ? ` / ${initiative.maxParticipants}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organizer Info */}
      <div className="bg-neutrals-100 mb-6 rounded-lg p-6">
        <h2 className="text-neutrals-700 mb-4 text-lg font-semibold">
          منظم المبادرة
        </h2>

        <Link href={organizerProfileLink}>
          <div className="hover:bg-neutrals-200 flex items-center gap-4 rounded-lg p-3 transition-colors">
            <div className="bg-secondary-100 border-neutrals-300 relative h-12 w-12 overflow-hidden rounded-full border">
              {organizerImage ? (
                <Image
                  src={organizerImage}
                  alt={organizerName}
                  fill
                  className="object-cover"
                />
              ) : initiative.organizerType === "user" ? (
                <User className="text-neutrals-500 h-full w-full p-2" />
              ) : (
                <Building className="text-neutrals-500 h-full w-full p-2" />
              )}
            </div>

            <div>
              <p className="text-neutrals-700 font-medium">{organizerName}</p>
              <p className="text-neutrals-500 text-sm">
                {initiative.organizerType === "user" ? "فرد" : "منظمة"}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
