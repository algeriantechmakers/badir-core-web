import { NextRequest, NextResponse } from "next/server";
import { OrganizationService } from "@/services/organizations";
import { OrganizationStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";

    const filters = search
      ? {
          search,
          status: {
            in: [OrganizationStatus.approved, OrganizationStatus.FROZEN],
          },
        }
      : {
          status: {
            in: [OrganizationStatus.approved, OrganizationStatus.FROZEN],
          },
        };
    const result = await OrganizationService.getMany(filters, { page, limit });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch organizations" },
      { status: 500 },
    );
  }
}
