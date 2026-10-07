import { prisma } from "@/lib/db";
import { PaginatedResponse, PaginationParams } from "@/types/Pagination";
import { Organization, OrganizationStatus, Prisma } from "@prisma/client";

export interface OrganizationCard {
  id: string;
  shortName?: string | null;
  name: string;
  logo?: string | null;
  description?: string | null;
  headquarters?: string | null;
  city?: string | null;
  country?: string | null;
  foundingDate?: Date | string | null;
  membersCount?: number | null;
  status?: OrganizationStatus | null;
}

export interface OrganizationFilters {
  search?: string;
  status?: { in: OrganizationStatus[] } | null;
  isFeaturedPartner?: boolean;
}

export class OrganizationService {
  static API_PATH = "/organizations";
  static async createOrganization(data: Prisma.OrganizationCreateInput) {
    return await prisma.organization.create({
      data,
    });
  }

  static async getOrganizationById(id?: string, userId?: string) {
    return await prisma.organization.findFirst({
      where: {
        OR: [{ id }, { owner: { id: userId } }],
      },
    });
  }

  static async getOrganizationLogo(id: string) {
    return await prisma.organization.findUnique({
      where: {
        userId: id,
      },
      select: { logo: true },
    });
  }

  static async updateOrganization(
    id: string,
    data: Prisma.OrganizationUpdateInput,
  ) {
    return await prisma.organization.update({
      where: { id },
      data,
    });
  }

  static async deleteOrganization(id: string) {
    return await prisma.organization.delete({
      where: { id },
    });
  }

  static async getOwnerNotificationDetails(orgId: string): Promise<{
    ownerUserId: string;
    ownerEmail: string;
    ownerName: string;
    orgName: string;
  }> {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    return {
      ownerUserId: organization.owner.id,
      ownerEmail: organization.owner.email,
      ownerName: organization.owner.name,
      orgName: organization.name,
    };
  }

  static async freeze(orgId: string): Promise<void> {
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        status: "FROZEN",
        updatedAt: new Date(),
      },
    });
  }

  static async unfreeze(orgId: string): Promise<void> {
    await prisma.organization.update({
      where: { id: orgId },
      data: { status: "approved", updatedAt: new Date() },
    });
  }

  static async remove(orgId: string): Promise<{
    ownerUserId: string;
    ownerEmail: string;
    orgName: string;
  }> {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    await prisma.organization.delete({
      where: { id: orgId },
    });

    return {
      ownerUserId: organization.owner.id,
      ownerEmail: organization.owner.email,
      orgName: organization.name,
    };
  }

  static async getMany(
    filters: OrganizationFilters = {},
    pagination: PaginationParams = { page: 1, limit: 12 },
  ): Promise<PaginatedResponse<OrganizationCard>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {};
    if (filters.search) {
      where.OR = [
        { shortName: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.isFeaturedPartner !== undefined) {
      where.isFeaturedPartner = filters.isFeaturedPartner;
    }

    const total = await prisma.organization.count({ where });
    const organizations = await prisma.organization.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getOrganizationByUserId(
    userId: string,
  ): Promise<Organization | null> {
    return await prisma.organization.findFirst({
      where: {
        owner: { id: userId },
      },
    });
  }

  /**
   * Get organizations for a specific user
   * @param userId User ID
   * @returns List of organizations
   */
  static async getUserOrganizations(
    userId: string,
  ): Promise<OrganizationCard[]> {
    try {
      const organizations = await prisma.organization.findMany({
        where: {
          userId: userId,
          status: "approved",
        },
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
          description: true,
          headquarters: true,
          city: true,
          country: true,
          foundingDate: true,
          membersCount: true,
        },
      });

      return organizations;
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      throw new Error("Failed to fetch user organizations");
    }
  }

  static async getOrganizationsCount() {
    return await prisma.organization.count();
  }

  /**
   * Get featured partner organizations (max 5, approved only)
   */
  static async getFeaturedPartners(): Promise<OrganizationCard[]> {
    const organizations = await prisma.organization.findMany({
      where: {
        isFeaturedPartner: true,
        status: "approved",
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    return organizations.map((org) => ({
      id: org.id,
      shortName: org.shortName,
      name: org.name,
      logo: org.logo,
      description: org.description,
      headquarters: org.headquarters,
      city: org.city,
      country: org.country,
      foundingDate: org.foundingDate,
      membersCount: org.membersCount,
      isApproved: org.status,
    }));
  }

  /**
   * Toggle featured partner status
   */
  static async toggleFeaturedPartner(
    id: string,
    isFeatured: boolean,
  ): Promise<Organization> {
    // If setting as featured, check if we already have 5 partners
    if (isFeatured) {
      const currentPartners = await prisma.organization.count({
        where: { isFeaturedPartner: true },
      });
      if (currentPartners >= 5) {
        throw new Error("لا يمكن إضافة أكثر من 5 شركاء مميزين");
      }
    }

    return await prisma.organization.update({
      where: { id },
      data: { isFeaturedPartner: isFeatured },
    });
  }
}
