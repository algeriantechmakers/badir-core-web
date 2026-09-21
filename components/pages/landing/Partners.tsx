import { partners } from "@/data/statics";
import PartnerMarquee from "./PartnerMarquee";
import { OrganizationService } from "@/services/organizations";
import { Partner } from "@/types/Statics";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getFeaturedPartners = unstable_cache(
  () => OrganizationService.getFeaturedPartners(),
  ["landing:featured-partners"],
  { revalidate: 1800, tags: ["organizations"] },
);

export default async function Partners() {
  let fivePartners: Partner[] = [];

  const featuredOrgs = await getFeaturedPartners();

  const fetched =
    featuredOrgs.map((item) => {
      return {
        name: item.name,
        imageSrc: item.logo,
        url: `/organizations/${item.id}`,
      } as Partner;
    }) ?? [];

  if (fetched.length === 0) {
    for (let i = 0; i < 5; i++) {
      fivePartners.push(partners[i % partners.length] as Partner);
    }
  } else {
    fivePartners = [...fetched];

    // Fill remaining slots with static partners if less than 5
    const remainingItems = Math.max(0, 5 - fivePartners.length);

    for (let i = 0; i < remainingItems; i++) {
      const idx = i % partners.length;
      fivePartners.push(partners[idx] as Partner);
    }
  }

  return (
    <section className="flex w-full flex-col items-center px-0" dir="rtl">
      <h2 className="section-title mb-8">شُـــركـــــــاؤنـــــا</h2>
      <PartnerMarquee partners={fivePartners} />
    </section>
  );
}
