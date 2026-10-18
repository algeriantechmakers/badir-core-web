import { prisma } from "@/lib/db";
import {
  Prisma,
  ReportReason,
  ReportStatus,
  ReportTarget,
} from "@prisma/client";

export type ReportWithDetails = Prisma.ReportGetPayload<{
  include: {
    reporter: {
      select: { id: true; firstName: true; lastName: true; name: true };
    };
    resolvedBy: { select: { name: true } };
  };
}> & {
  targetName: string;
  targetOwnerId: string | null;
  organizerOrgId: string | null;
};

export class ReportService {
  /** Creates a report and rejects duplicate pending reports from the same reporter. */
  static async create(data: {
    reporterId: string;
    targetType: ReportTarget;
    targetId: string;
    reason: ReportReason;
    customReason?: string;
  }) {
    const duplicate = await prisma.report.findFirst({
      where: {
        reporterId: data.reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        status: ReportStatus.PENDING,
      },
    });
    if (duplicate) throw new Error("DUPLICATE_REPORT");

    return prisma.report.create({ data });
  }

  /** Returns reports with a resolved display target and moderation ownership details. */
  static async getAll(filters?: {
    status?: ReportStatus;
    targetType?: ReportTarget;
  }): Promise<ReportWithDetails[]> {
    const reports = await prisma.report.findMany({
      where: { status: filters?.status, targetType: filters?.targetType },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, name: true },
        },
        resolvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      reports.map(async (report) => {
        if (report.targetType === ReportTarget.USER) {
          const target = await prisma.user.findUnique({
            where: { id: report.targetId },
            select: { name: true, id: true },
          });
          return {
            ...report,
            targetName: target?.name || "مستخدم غير موجود",
            targetOwnerId: target?.id || null,
            organizerOrgId: null,
          };
        }
        if (report.targetType === ReportTarget.ORGANIZATION) {
          const target = await prisma.organization.findUnique({
            where: { id: report.targetId },
            select: { name: true, userId: true },
          });
          return {
            ...report,
            targetName: target?.name || "منظمة غير موجودة",
            targetOwnerId: target?.userId || null,
            organizerOrgId: null,
          };
        }
        const target = await prisma.initiativePost.findUnique({
          where: { id: report.targetId },
          select: {
            title: true,
            authorId: true,
            initiative: { select: { organizerOrgId: true } },
          },
        });
        return {
          ...report,
          targetName: target?.title || "منشور غير موجود",
          targetOwnerId: target?.authorId || null,
          organizerOrgId: target?.initiative.organizerOrgId || null,
        };
      }),
    );
  }

  /** Marks a report as resolved by the acting manager. */
  static async resolve(reportId: string, resolvedById: string) {
    return prisma.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
  }

  /** Dismisses a report without taking action against its target. */
  static async dismiss(reportId: string, resolvedById: string) {
    return prisma.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.DISMISSED,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
  }
}
