import InitiativeCard from "@/components/pages/InitiativeCard";
import UserProfileForm from "@/components/pages/profile/UserProfile";
import OrganizationProfileForm from "@/components/pages/profile/OrganizationProfile";
import NewsletterSubscription from "@/components/pages/NewsletterSubscription";
import getSessionWithCheckProfile from "@/hooks/getSessionWithCheckProfile";
import { toPlainOrganization, toPlainUser } from "@/lib/utils";
import { UserService } from "@/services/user";
import { OrganizationService } from "@/services/organizations";
import { OrganizationStatus, UserType } from "@prisma/client";
import { InitiativeService } from "@/services/initiatives";
import OrgInitiative from "@/components/pages/OrgInitiative";
import DeleteAccount from "@/components/pages/profile/DeleteAccount";

export default async function Page() {
  const session = await getSessionWithCheckProfile();

  try {
    if (session === null) return null;

    if (session.user.userType === UserType.organization) {
      const organizationData =
        await OrganizationService.getOrganizationByUserId(session.user.id);

      if (!organizationData) {
        return <div>منظمتك غير موجودة أو لم يتم إعدادها بشكل صحيح</div>;
      }

      if (organizationData.status === OrganizationStatus.pending) {
        return (
          <div
            className="bg-neutrals-100 flex min-h-screen items-center justify-center p-6"
            dir="rtl"
          >
            <p>
              منظمتك بحاجة إلى الموافقة قبل أن تتمكن من الوصول إلى هذه الصفحة.
            </p>
          </div>
        );
      } else if (organizationData.status === OrganizationStatus.rejected) {
        return (
          <div
            className="bg-neutrals-100 flex min-h-screen items-center justify-center p-6"
            dir="rtl"
          >
            <p>
              تم رفض طلب مؤسستك لعدم اتباع الشروط. يرجى الاتصال بالدعم للحصول
              على مزيد من المعلومات.
            </p>
          </div>
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plainOrgData = toPlainOrganization(organizationData) as any;

      const orgInitiatives =
        await InitiativeService.getOrgInitiativesWithAvgRating(
          organizationData.id,
        );

      return (
        <div className="bg-neutrals-100 min-h-screen p-6" dir="rtl">
          <div
            className="border-neutrals-300 mx-auto max-w-5xl rounded-lg border-2 bg-white p-6 shadow-sm"
            dir="rtl"
          >
            <OrganizationProfileForm defaultValues={plainOrgData} />
            <div className="mt-6">
              <NewsletterSubscription />
            </div>
            {orgInitiatives.length > 0 && (
              <div
                className="container w-full px-4 pt-2 pb-6 md:px-6"
                dir="rtl"
              >
                <h2 className="mb-4 text-2xl font-semibold">مبادراتكم</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {orgInitiatives.map((initiative) => (
                    <OrgInitiative
                      key={initiative.id}
                      initiative={initiative}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="border-neutrals-300 mx-auto mt-6 max-w-5xl rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-red-600">
              منطقة خطرة
            </h2>
            <DeleteAccount />
          </div>
        </div>
      );
    } else {
      const userProfile = await UserService.getUser(session.user.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let userProfileData = { ...userProfile } as Partial<any>;

      if (userProfile) {
        userProfileData = toPlainUser(
          userProfile,
          userProfile.qualifications?.[0],
        );
      }

      return (
        <div className="bg-neutrals-100 min-h-screen p-6" dir="rtl">
          <div
            className="border-neutrals-300 mx-auto max-w-5xl rounded-lg border-2 bg-white p-6 shadow-sm"
            dir="rtl"
          >
            {!userProfile?.isActive && (
              <div
                className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
                role="alert"
              >
                <p className="font-semibold">
                  حسابك موقوف مؤقتاً. تواصل مع الدعم لمزيد من المعلومات.
                </p>
              </div>
            )}
            <UserProfileForm defaultValues={userProfileData} />
            <div className="mt-6">
              <NewsletterSubscription />
            </div>
          </div>
          <div className="border-neutrals-300 mx-auto mt-6 max-w-5xl rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-red-600">
              منطقة خطرة
            </h2>
            <DeleteAccount />
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error("Error loading profile page:", error);
    return <div>Error loading profile page</div>;
  }
}
