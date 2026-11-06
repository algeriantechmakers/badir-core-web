import Image from "next/image";
import { OrganizationCard as OrganizationCardType } from "@/services/organizations";
import { Building, MapPin, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function OrganizationCard({
  org,
}: {
  org: OrganizationCardType;
}) {
  return (
    <div className="bg-neutrals-100 hover:border-primary-300 flex flex-col items-start gap-3 rounded-lg border p-4 shadow transition-colors sm:flex-row sm:items-center">
      <div className="bg-secondary-100 relative mx-auto h-14 w-14 shrink-0 overflow-hidden rounded-full border sm:mx-0 sm:h-16 sm:w-16">
        {org.logo ? (
          <Image
            src={org.logo}
            alt={org.shortName || org.name}
            fill
            sizes="(max-width: 640px) 56px, 64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building className="text-neutrals-500 h-8 w-8" />
          </div>
        )}
      </div>

      <div className="w-full flex-1">
        <Link href={`/organizations/${org.id}`}>
          <h3 className="text-primary-700 hover:text-primary-500 truncate text-center text-lg font-bold hover:underline sm:text-right">
            {org.shortName || org.name}
          </h3>
        </Link>
        {/* Description - Hide on very small screens */}
        {org.description && (
          <p className="text-label text-neutrals-500 xs:block line-clamp-1 hidden">
            {org.description}
          </p>
        )}

        <div className="text-neutrals-600 mt-2 grid grid-cols-1 gap-y-1 text-xs">
          {org.membersCount && (
            <div className="flex items-center justify-center gap-1 sm:justify-start">
              <Users className="h-3 w-3 shrink-0" />
              <span className="text-caption">
                <span className="font-semibold">عدد الأعضاء:</span>{" "}
                {org.membersCount}
              </span>
            </div>
          )}

          {(org.headquarters || org.city || org.country) && (
            <div className="flex items-center justify-center gap-1 sm:justify-start">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="text-caption truncate">
                {[
                  org.headquarters && `المقر: ${org.headquarters}`,
                  org.city,
                  org.country,
                ]
                  .filter(Boolean)
                  .join(" - ")}
              </span>
            </div>
          )}

          {org.foundingDate && (
            <div
              className={cn(
                "flex items-center justify-center gap-1 sm:justify-start",
                org.headquarters || org.city || org.country
                  ? "col-span-1"
                  : "col-span-2",
              )}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="text-caption">
                <span className="font-semibold">تأسست:</span>{" "}
                {new Date(org.foundingDate).toLocaleDateString("ar-DZ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
