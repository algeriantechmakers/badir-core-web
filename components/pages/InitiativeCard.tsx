import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpLeft,
  Clock,
  Wifi,
  MapPin,
  Users,
  XCircle,
  AlertCircle,
  Triangle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  InitiativeStatus,
  OrganizerType,
  ParticipantRole,
  ParticipationStatus,
} from "@prisma/client";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import AppButton from "../AppButton";
import AvailabilityBadge from "./AvailabilityBadge";
import CategoryBadge from "./CategoryBadge";
import Ratings from "../Ratings";
import { formatDate } from "@/lib/utils";
import { InitiativeCard as InitiativeCardType } from "@/services/initiatives";
import { UserParticipation } from "@/services/participations";

// ------------ Shared sub-types ------------

type BrowseProps = {
  mode: "browse";
  initiative: InitiativeCardType;
  userId?: string;
  className?: string;
};

type ParticipationProps = {
  mode: "participation";
  participation: UserParticipation;
  /** When true, shows the initiative avg rating instead of the user's own */
  isInspecting?: boolean;
  className?: string;
};

type InitiativeCardProps = BrowseProps | ParticipationProps;

// ------------ Helpers ------------

function OnlineModeBadge({ isOnline }: { isOnline: boolean }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              isOnline
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>عن بُعد</span>
              </>
            ) : (
              <>
                <MapPin className="h-3 w-3" />
                <span>حضوري</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isOnline
            ? "مبادرة عن بُعد - يمكن المشاركة من أي مكان"
            : "مبادرة حضورية - تتطلب الحضور الفعلي"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ParticipationStatusBadgeInline({
  status,
  role,
}: {
  status: ParticipationStatus;
  role: ParticipantRole;
}) {
  if (status === ParticipationStatus.approved) {
    const label =
      role === ParticipantRole.manager
        ? "مُنظِّم"
        : role === ParticipantRole.helper
          ? "مساعد"
          : "مشارك";
    return (
      <Badge className="bg-state-success text-secondary-700 rounded-full px-3 py-1 text-xs font-medium">
        {label}
      </Badge>
    );
  }

  const configs: Record<
    string,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    [ParticipationStatus.registered]: {
      icon: <Clock className="h-4 w-4" />,
      label: "في انتظار الموافقة",
      className: "bg-state-warning text-neutrals-700",
    },
    [ParticipationStatus.rejected]: {
      icon: <Triangle className="h-4 w-4" />,
      label: "تم رفض طلبك",
      className: "bg-neutrals-700 text-neutrals-300",
    },
    [ParticipationStatus.kicked]: {
      icon: <XCircle className="h-4 w-4" />,
      label: "تم طردك",
      className: "bg-state-error text-neutrals-700",
    },
  };

  const cfg = configs[status] ?? {
    icon: <AlertCircle className="h-4 w-4" />,
    label: status,
    className: "bg-state-error text-neutrals-700",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={`rounded-full px-2 py-1 ${cfg.className}`}>
            {cfg.icon}
            <span className="sr-only">{cfg.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{cfg.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ------------ Shared layout sections ------------

function DateRange({
  startDate,
  endDate,
}: {
  startDate: Date | string;
  endDate: Date | string;
}) {
  return (
    <div className="text-neutrals-700 lg:border-secondary-700 shrink-0 flex-wrap text-sm lg:border-r-2 lg:pr-4">
      <span className="font-semibold">{formatDate(startDate)}</span>
      <span className="mx-2">إلى</span>
      <span className="font-semibold">{formatDate(endDate)}</span>
    </div>
  );
}

function LocationAndCount({
  city,
  isOnline,
  currentParticipants,
  maxParticipants,
}: {
  city?: string | null;
  isOnline?: boolean;
  currentParticipants?: number;
  maxParticipants?: number | null;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      {!isOnline && city && (
        <div className="text-neutrals-600 flex items-center gap-2 text-sm">
          <Image
            src="/images/icons/map-pin.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden
          />
          <span>{city}</span>
        </div>
      )}
      {currentParticipants !== undefined && (
        <div className="text-neutrals-600 flex items-center gap-2 text-sm">
          <Image
            src="/images/icons/group-reverse.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden
          />
          <span className="truncate whitespace-nowrap">
            {maxParticipants
              ? `${currentParticipants} / ${maxParticipants} متطوع`
              : `${currentParticipants}`}
          </span>
        </div>
      )}
    </div>
  );
}

// ------------ Main unified component ------------

export default function InitiativeCard(props: InitiativeCardProps) {
  const { className } = props;

  // ------------ Browse mode ------------
  if (props.mode === "browse") {
    const { initiative } = props;
    const {
      id,
      category,
      titleAr,
      shortDescriptionAr,
      startDate,
      endDate,
      city,
      currentParticipants,
      maxParticipants,
      organizer,
      registrationDeadline,
      isOnline,
      avgRating,
    } = initiative;

    const now = new Date();
    const isDeadlinePassed =
      !!registrationDeadline && registrationDeadline < now;
    const isAvailable =
      !maxParticipants || currentParticipants < maxParticipants;
    const isOngoing = now >= new Date(startDate) && now <= new Date(endDate);
    const isCompleted = now > new Date(endDate);
    const isRegistrationClosed =
      isDeadlinePassed ||
      !isAvailable ||
      initiative.status !== InitiativeStatus.published;

    return (
      <Card
        className={`bg-neutrals-100 border-secondary-700 relative mx-auto h-full w-full max-w-2xl rounded-xl border-2 p-4 shadow-md md:p-6 ${className ?? ""}`}
        dir="rtl"
      >
        <CardContent className="flex-center-column h-full justify-between gap-4 p-0.5">
          {registrationDeadline && (
            <TooltipProvider>
              <Tooltip>
                <TooltipContent>
                  <p>الموعد النهائي للتسجيل</p>
                  <p dir="rtl">{formatDate(registrationDeadline)}</p>
                </TooltipContent>
                <TooltipTrigger
                  className="absolute top-1 right-1"
                  aria-label="Show registration deadline"
                >
                  <Clock className="text-neutrals-400 h-6 w-6" />
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Badges row */}
          <div className="mt-2 flex w-full flex-wrap items-start justify-between gap-2 sm:mt-1">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge
                nameAr={category.nameAr}
                bgColor={category.bgColor ?? "transparent"}
                textColor={category.textColor ?? "inherit"}
              />
              <OnlineModeBadge isOnline={isOnline} />
            </div>
            <AvailabilityBadge
              initiativeStatus={initiative.status}
              isAvailable={isAvailable && !isDeadlinePassed}
              isOngoing={isOngoing}
              isCompleted={isCompleted}
              isCancelled={initiative.status === "cancelled"}
            />
          </div>

          {/* Title + Date */}
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <Link
              href={`/initiatives/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutrals-700 flex-1 text-lg leading-tight font-bold hover:underline md:text-xl lg:text-2xl"
            >
              {titleAr}
            </Link>
            <DateRange startDate={startDate} endDate={endDate} />
          </div>

          {/* Description */}
          {shortDescriptionAr && (
            <p className="text-neutrals-500 w-full text-sm leading-relaxed md:text-base">
              {shortDescriptionAr}
            </p>
          )}

          {/* Location + participants */}
          <div className="w-full">
            <LocationAndCount
              city={city}
              isOnline={isOnline}
              currentParticipants={currentParticipants}
              maxParticipants={maxParticipants}
            />
          </div>

          {initiative.status === InitiativeStatus.completed && (
            <Ratings
              value={avgRating != null ? Number(avgRating) : 0}
              readOnly
              allowHalf
              size="sm"
            />
          )}

          {/* Organizer */}
          <div className="text-neutrals-500 w-full text-sm md:text-base">
            نُظِّمت بواسطة:{" "}
            <span className="text-neutrals-600 hover:text-primary-500 font-medium hover:underline">
              <Link
                href={
                  organizer.id && organizer.id !== "unknown"
                    ? organizer.type === OrganizerType.organization
                      ? `/organizations/${organizer.id}`
                      : `/profile/${organizer.id}`
                    : ``
                }
                className={
                  organizer.id && organizer.id !== "unknown"
                    ? ""
                    : "pointer-events-none no-underline hover:no-underline"
                }
              >
                {organizer.name}
              </Link>
            </span>
          </div>

          {/* CTA */}
          <div className="flex w-full justify-end pt-2">
            <AppButton
              type="outline"
              border="rounded"
              size="md"
              icon={<ArrowUpLeft />}
              className={`w-full sm:w-auto ${
                isRegistrationClosed ? "opacity-50 grayscale" : ""
              }`}
              url={`/initiatives/${id}`}
            >
              انضم للمبادرة
            </AppButton>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ------------ Participation mode -------------
  const { participation, isInspecting = false } = props;
  const { participantRole, status, initiative, rating, avgRating } =
    participation;
  const {
    category,
    organizerOrg,
    organizerUser,
    titleAr,
    startDate,
    endDate,
    city,
  } = initiative;

  const organizerName = organizerOrg
    ? organizerOrg.name
    : `${organizerUser?.firstName ?? ""} ${organizerUser?.lastName ?? ""}`.trim();
  const isCompleted = initiative.status === InitiativeStatus.completed;
  const displayedRating = isInspecting
    ? (avgRating ?? 0)
    : rating?.rating
      ? Number(rating.rating)
      : 0;

  return (
    <Card
      className={`bg-neutrals-100 border-secondary-700 mx-auto h-full w-full max-w-2xl rounded-xl border-2 p-4 shadow-md md:p-6 ${className ?? ""}`}
      dir="rtl"
    >
      <CardContent className="flex-center-column h-full justify-between gap-2 p-0">
        {/* Badges row */}
        <div className="flex items-start justify-between gap-1">
          <CategoryBadge
            nameAr={category.nameAr}
            bgColor={category.bgColor ?? "transparent"}
            textColor={category.textColor ?? "inherit"}
          />
          <ParticipationStatusBadgeInline
            status={status}
            role={participantRole}
          />
        </div>

        {/* Title + Date */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
          <Link href={`/initiatives/${initiative.id}`} className="flex-1">
            <h3 className="text-neutrals-700 flex-1 text-lg leading-tight font-bold hover:underline md:text-xl lg:text-2xl">
              {titleAr}
            </h3>
          </Link>
          <DateRange startDate={startDate} endDate={endDate} />
        </div>

        {/* Organizer */}
        <p className="text-neutrals-500 text-sm md:text-base">
          نُظِّمت بواسطة:{" "}
          <span className="text-neutrals-600 font-medium">{organizerName}</span>
        </p>

        {/* Location + rating */}
        <div className="flex-center mt-2 w-full justify-between gap-4">
          {city && (
            <div className="text-neutrals-600 flex items-center gap-2 text-sm">
              <div className="flex-center bg-primary-500 size-fit rounded-full p-0.5">
                <MapPin className="text-neutrals-100 h-5 w-5" />
              </div>
              <span>{city}</span>
            </div>
          )}

          {isCompleted && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="cursor-pointer">
                    <Ratings
                      value={displayedRating}
                      readOnly
                      allowHalf
                      size="sm"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!isInspecting
                    ? rating?.rating
                      ? `تقييمك: ${rating.rating} من 5`
                      : "لم تقم بتقييم هذه المبادرة بعد"
                    : avgRating
                      ? `تقييم: ${avgRating} من 5`
                      : "لم يقم أحد بتقييم هذه المبادرة بعد"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
