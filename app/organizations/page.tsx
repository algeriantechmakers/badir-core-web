import { OrganizationService } from "@/services/organizations";
import OrganizationsList from "@/components/pages/organizations/OrganizationsList";
import { OrganizationStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "المنظمات - بادر",
  description: "المنظمات المسجلة على منصة بادر",
};

export const dynamic = "force-dynamic";

const getApprovedOrganizations = unstable_cache(
  () =>
    OrganizationService.getMany(
      { status: OrganizationStatus.approved },
      { page: 1, limit: 12 },
    ),
  ["organizations:approved:p1"],
  { revalidate: 1800, tags: ["organizations"] },
);

export default async function Page() {
  const initialData = await getApprovedOrganizations();
  const dataPaginated = { ...initialData, data: initialData.data };
  return <OrganizationsList initialData={dataPaginated} />;
}
