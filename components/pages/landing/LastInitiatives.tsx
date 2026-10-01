import AppButton from "@/components/AppButton";
import {
  InitiativeCard as InitiativeCardType,
  InitiativeService,
} from "@/services/initiatives";
import {
  InitiativeStatus,
  OrganizerType,
  TargetAudience,
} from "@prisma/client";
import { ArrowUpLeft } from "lucide-react";
import { unstable_cache } from "next/cache";
import React from "react";
import InitiativeCard from "../InitiativeCard";

export const dynamic = "force-dynamic";

const getLatestInitiatives = unstable_cache(
  () => InitiativeService.getMany({}, { page: 1, limit: 3 }),
  ["landing:last-initiatives"],
  { revalidate: 1800, tags: ["initiatives"] },
);

// fallback initiatives when database is empty
function generateFallbackInitiatives(count: number): InitiativeCardType[] {
  const initiatives = [
    {
      titleAr: "برنامج محو الأمية للكبار",
      shortDescriptionAr: "تعليم القراءة والكتابة للكبار في المناطق النائية",
      category: {
        nameAr: "التعليم",
        nameEn: "Education",
        bgColor: "#E3F2FD",
        textColor: "#1976D2",
      },
      organizer: {
        name: "جمعية التنمية المحلية",
      },
      city: "الجزائر",
      maxParticipants: 50,
      currentParticipants: 25,
    },
    {
      titleAr: "حملة التبرع بالدم",
      shortDescriptionAr: "تبرع بالدم وأنقذ حياة - حملة توعوية وتطوعية",
      category: {
        nameAr: "الصحة",
        nameEn: "Health",
        bgColor: "#F3E5F5",
        textColor: "#7B1FA2",
      },
      organizer: {
        name: "الهلال الأحمر",
      },
      city: "وهران",
      maxParticipants: 100,
      currentParticipants: 67,
    },
    {
      titleAr: "ورشة الكتابة الإبداعية للشباب",
      shortDescriptionAr: "تطوير مهارات الكتابة والتعبير الإبداعي لدى الشباب",
      category: {
        nameAr: "الفكر",
        nameEn: "Mind",
        bgColor: "#E8F5E8",
        textColor: "#388E3C",
      },
      organizer: {
        name: "نادي الأدب والثقافة",
      },
      city: "قسنطينة",
      maxParticipants: 30,
      currentParticipants: 18,
    },
  ];

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return initiatives.slice(0, count).map((init, index) => ({
    id: `fallback-${index + 1}`,
    titleAr: init.titleAr,
    titleEn: null,
    shortDescriptionAr: init.shortDescriptionAr,
    shortDescriptionEn: null,
    city: init.city,
    startDate: nextWeek,
    endDate: nextMonth,
    maxParticipants: init.maxParticipants,
    currentParticipants: init.currentParticipants,
    targetAudience: TargetAudience.both,
    status: InitiativeStatus.published,
    registrationDeadline: null,
    isOnline: false,
    category: init.category,
    organizer: {
      id: `org-${index + 1}`,
      type: OrganizerType.organization,
      name: init.organizer.name,
      image: null,
    },
  }));
}

export default async function LastInitiatives() {
  const initialInitiatives = await getLatestInitiatives();

  let threeInitiatives = initialInitiatives.data;

  if (initialInitiatives.data.length < 3) {
    const needed = 3 - initialInitiatives.data.length;
    const fallbacks = generateFallbackInitiatives(needed);
    threeInitiatives = [...threeInitiatives, ...fallbacks];
  }

  return (
    <section className="flex-center-column items-center" dir="rtl">
      <h2 className="section-title">آخـــر المبادرات</h2>
      <div className="mx-auto grid grid-cols-1 gap-6 p-6 max-xl:w-full sm:grid-cols-2 lg:grid-cols-3">
        {threeInitiatives.map((initiative) => (
          <InitiativeCard
            key={initiative.id}
            mode="browse"
            initiative={initiative}
            className="sm:col-span-2 lg:col-span-1"
          />
        ))}
      </div>
      <AppButton
        type="primary"
        icon={<ArrowUpLeft className="h-4 w-4 sm:h-6 sm:w-6" />}
        border="rounded"
        url="/initiatives"
      >
        عرض جميع المبادرات
      </AppButton>
    </section>
  );
}
