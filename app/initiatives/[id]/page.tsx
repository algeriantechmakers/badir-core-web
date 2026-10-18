import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import parse from "html-react-parser";
import {
  InitiativeStatus,
  ParticipantRole,
  ParticipationStatus,
  UserType,
} from "@prisma/client";
import InitiativeJoinForm from "@/components/pages/initiatives/InitiativeJoinForm";
import InitiativeDetails from "@/components/pages/initiatives/InitiativeDetails";
import ParticipationStatusBadge from "@/components/pages/ParticipationStatusBadge";
import AvailabilityBadge from "@/components/pages/AvailabilityBadge";
import getSessionWithCheckProfile from "@/hooks/getSessionWithCheckProfile";
import { InitiativeService } from "@/services/initiatives";
import BackButton from "@/components/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostsPanel from "@/components/pages/initiatives/PostsPanel";
import MembersPanel from "@/components/pages/initiatives/MembersPanel";
import RequestsPanel from "@/components/pages/initiatives/RequestsPanel";
import InitiativeReviewsPanel from "@/components/pages/initiatives/InitiativeReviewsPanel";
import InitiativeRatingForm from "@/components/pages/initiatives/InitiativeRatingForm";
import InitiativeHeader from "@/components/pages/InitiativeHeader";
import AppButton from "@/components/AppButton";
import Link from "next/link";
import CancelParticipationButton from "@/components/pages/initiatives/CancelParticipationButton";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const initiative = await InitiativeService.getById(id);

    if (!initiative) {
      return {
        title: "المبادرة غير متوفرة - بادر",
        description: "المبادرة المطلوبة غير موجودة",
      };
    }

    return {
      title: `${initiative.titleAr} - بادر`,
      description: initiative.shortDescriptionAr || "مبادرة على منصة بادر",
    };
  } catch (error) {
    console.error(
      "Error generating metadata for initiative details page:",
      error,
    );
    return {
      title: "المبادرة غير موجودة - بادر",
      description: "حدث خطأ أثناء تحميل المبادرة",
    };
  }
}

export default async function InitiativeDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const session = await getSessionWithCheckProfile();

  const initiative = await InitiativeService.getById(id, session?.user.id);
  if (!initiative) {
    notFound();
  }

  const userParticipation = initiative.participants?.[0] || null;

  const isDeadlinePassed =
    initiative.registrationDeadline &&
    initiative.registrationDeadline < new Date();

  const isAvailable =
    initiative.status === InitiativeStatus.published &&
    (!initiative.maxParticipants ||
      initiative.currentParticipants < initiative.maxParticipants);

  const now = new Date();
  const isCompleted = now > initiative.endDate;
  const isOngoing = now >= initiative.startDate && now <= initiative.endDate;

  const registrationClosed =
    initiative.registrationDeadline && initiative.registrationDeadline < now;
  const isFull =
    initiative.maxParticipants !== null &&
    initiative.currentParticipants >= initiative.maxParticipants;

  const canJoin =
    isAvailable &&
    !isCompleted &&
    !registrationClosed &&
    !isFull &&
    !userParticipation;

  // Role resolution
  const isApprovedParticipant =
    !!userParticipation &&
    userParticipation.status === ParticipationStatus.approved;

  const isHelperApproved =
    !!userParticipation &&
    userParticipation.participantRole === ParticipantRole.helper &&
    userParticipation.status === ParticipationStatus.approved;

  const isManager =
    !!session?.user?.id &&
    (initiative.organizerUserId === session.user.id ||
      initiative.organizerOrg?.userId === session.user.id);

  const canViewPosts = isManager || isApprovedParticipant;
  const canWritePosts = isManager || isHelperApproved;

  // Ratings: an initiative becomes ratable once it is marked completed.
  const isClosedForRating = initiative.status === InitiativeStatus.completed;
  const canRate = isClosedForRating && isApprovedParticipant;

  const reviews = isManager
    ? (await InitiativeService.getInitiativeRatings(initiative.id)).map(
        (r) => ({
          id: r.id,
          rating: r.rating !== null ? Number(r.rating) : null,
          comment: r.comment,
          user: r.user,
        }),
      )
    : [];

  const existingRating =
    canRate && session?.user?.id
      ? await InitiativeService.getUserRating(session.user.id, initiative.id)
      : null;

  const formQuestions = initiative.participationQstForm
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (initiative.participationQstForm as any[]).map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        required: q.required,
        options: q.options || [],
      }))
    : [];

  if (
    initiative.status !== InitiativeStatus.published &&
    initiative.status !== InitiativeStatus.completed
  ) {
    if (!isManager) {
      notFound(); // Non-creators cannot access at all
    }
    const isIndividualUser = session?.user.userType !== UserType.organization;
    if (isIndividualUser) {
      return (
        <div className="bg-neutrals-100 min-h-screen p-6" dir="rtl">
          <div className="mb-4 flex justify-end">
            <BackButton />
          </div>

          <div className="border-neutrals-300 mx-auto max-w-3xl rounded-lg border-2 bg-white p-6 text-center shadow-sm">
            <h2 className="text-primary-600 mb-2 text-xl font-semibold">
              المبادرة قيد المراجعة
            </h2>
            <p className="text-neutrals-700">
              مبادرتك ما زالت قيد المراجعة من قبل فريق بادر. ستتم مراجعتها
              قريبًا وقد يستغرق ظهورها للمشاركين بعض الوقت.
            </p>
          </div>
          <div className="mt-4 mb-4 flex justify-center">
            <AppButton
              type="primary"
              size="sm"
              border="square"
              url={`/initiatives/${initiative.id}/edit`}
            >
              تعديل المبادرة
            </AppButton>
          </div>
        </div>
      );
    }
  }

  if (isClosedForRating && !isManager && !isApprovedParticipant) {
    notFound();
  }

  if (canViewPosts) {
    return (
      <div className="bg-neutrals-100 min-h-screen" dir="rtl">
        <InitiativeHeader
          title={initiative.titleAr}
          shortDescription={initiative.shortDescriptionAr}
          startDate={
            initiative.startDate?.toISOString?.() ?? initiative.startDate
          }
          endDate={initiative.endDate?.toISOString?.() ?? initiative.endDate}
          coverImage={initiative.coverImage}
        />
        <div className="p-6">
          <Tabs defaultValue="posts" className="w-full flex-col" dir="rtl">
            <TabsList className="mb-4">
              <TabsTrigger value="posts">المنشورات</TabsTrigger>
              {isManager && <TabsTrigger value="members">الأعضاء</TabsTrigger>}
              {isManager && <TabsTrigger value="requests">الطلبات</TabsTrigger>}
              {isManager && (
                <TabsTrigger value="reviews">التقييمات</TabsTrigger>
              )}
              {!isManager && canWritePosts && (
                <TabsTrigger value="your-posts">منشوراتك</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="posts">
              <PostsPanel
                initiativeId={initiative.id}
                canWrite={canWritePosts}
                isManager={isManager}
                managerId={
                  initiative.organizerOrgId || initiative.organizerUserId || ""
                }
                currentUserId={session?.user?.id}
              />
            </TabsContent>

            {isManager && (
              <TabsContent value="members">
                <MembersPanel initiativeId={initiative.id} />
              </TabsContent>
            )}

            {isManager && (
              <TabsContent value="requests">
                <RequestsPanel initiativeId={initiative.id} />
              </TabsContent>
            )}

            {isManager && (
              <TabsContent value="reviews">
                <InitiativeReviewsPanel reviews={reviews} />
              </TabsContent>
            )}

            {!isManager && canWritePosts && (
              <TabsContent value="your-posts">
                <PostsPanel
                  initiativeId={initiative.id}
                  canWrite={true}
                  isManager={false}
                  managerId={initiative.organizerUserId || ""}
                  currentUserId={session?.user?.id}
                  onlyMine
                />
              </TabsContent>
            )}
          </Tabs>

          {canRate && (
            <div className="mt-8">
              <InitiativeRatingForm
                initiativeId={initiative.id}
                initialRating={
                  existingRating
                    ? {
                        rating:
                          existingRating.rating !== null
                            ? Number(existingRating.rating)
                            : null,
                        comment: existingRating.comment,
                      }
                    : null
                }
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutrals-100 min-h-screen p-6" dir="rtl">
      <div className="mb-4 flex justify-end">
        <BackButton />
      </div>
      <div className="border-neutrals-300 mx-auto max-w-5xl rounded-lg border-2 bg-white p-6 shadow-sm">
        {/* Initiative Header */}
        <div className="relative mb-6">
          {initiative.coverImage && (
            <div className="relative mb-4 h-64 w-full overflow-hidden rounded-lg">
              <Image
                src={initiative.coverImage || ""}
                alt={initiative.titleAr}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <h1 className="text-primary-600 text-3xl font-bold">
              {parse(initiative.titleAr)}
            </h1>

            <div className="flex gap-2">
              <AvailabilityBadge
                initiativeStatus={initiative.status}
                isAvailable={isAvailable && !isDeadlinePassed}
                isCompleted={isCompleted}
                isOngoing={isOngoing}
              />

              {userParticipation && (
                <ParticipationStatusBadge status={userParticipation.status} />
              )}
            </div>
          </div>

          <div className="text-neutrals-500 mt-2 flex items-center text-sm">
            <span className="ml-1 font-medium">التصنيف:</span>
            <span>{initiative.category.nameAr}</span>
          </div>
        </div>

        {/* Initiative Details */}
        <InitiativeDetails initiative={initiative} />

        {/* Join Form Section */}
        {canJoin && (
          <div className="bg-neutrals-100 mt-8 rounded-lg p-6">
            <h2 className="text-primary-600 mb-4 text-xl font-semibold">
              الانضمام إلى المبادرة
            </h2>

            {session?.user ? (
              <InitiativeJoinForm
                initiativeId={initiative.id}
                hasForm={formQuestions.length > 0}
                formQuestions={formQuestions}
                allowedRoles={initiative.targetAudience}
                userType={session?.user.userType as UserType}
              />
            ) : (
              <div className="bg-neutrals-200 rounded-lg p-4 text-center">
                <p className="text-neutrals-700">
                  يجب تسجيل الدخول للانضمام إلى المبادرة
                </p>
                <Link
                  href={`/login?callbackUrl=/initiatives/${initiative.id}`}
                  className="text-primary-600 mt-2 inline-block font-semibold hover:underline"
                >
                  تسجيل الدخول
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Registration Closed Message */}
        {isAvailable && registrationClosed && (
          <div className="bg-neutrals-100 mt-8 rounded-lg p-6 text-center">
            <p className="text-neutrals-700 font-semibold">
              انتهت فترة التسجيل لهذه المبادرة
            </p>
          </div>
        )}

        {/* Initiative Full Message */}
        {isAvailable && isFull && (
          <div className="bg-neutrals-100 mt-8 rounded-lg p-6 text-center">
            <p className="text-neutrals-700 font-semibold">
              المبادرة مكتملة العدد
            </p>
          </div>
        )}

        {/* Already Registered Message */}
        {userParticipation && (
          <div className="bg-neutrals-100 mt-8 rounded-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-primary-600 text-xl font-semibold">
                حالة مشاركتك
              </h2>
              {userParticipation.status === ParticipationStatus.registered &&
                !registrationClosed && (
                  <CancelParticipationButton initiativeId={initiative.id} />
                )}
            </div>
            <div className="border-neutrals-300 rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-neutrals-700 mb-2">
                أنت مسجل في هذه المبادرة بدور:
                <span className="mx-1 font-semibold">
                  {userParticipation.participantRole ===
                  ParticipantRole.participant
                    ? "مشارك"
                    : userParticipation.participantRole ===
                        ParticipantRole.helper
                      ? "مساعد"
                      : "منظم"}
                </span>
              </p>
              <p className="text-neutrals-700">
                حالة طلبك:
                <ParticipationStatusBadge
                  status={userParticipation.status}
                  className="mr-2"
                />
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
