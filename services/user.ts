import { prisma } from "@/lib/db";
import { Prisma, User, UserQualification } from "@prisma/client";

export class UserService {
  static async getUser(
    userId: string,
  ): Promise<(User & { qualifications: UserQualification[] }) | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: { qualifications: true },
    });
  }

  static async updateUser(userId: string, data: Prisma.UserUpdateInput) {
    return await prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /** Freezes a user account and invalidates all active sessions. */
  static async freeze(
    userId: string,
  ): Promise<{ userEmail: string; userName: string }> {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: { email: true, name: true },
      });

      await tx.session.deleteMany({ where: { userId } });

      return { userEmail: user.email, userName: user.name };
    });
  }

  /** Re-enables a frozen user account. */
  static async unfreeze(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  static async deleteUser(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Remove from email queue so they get no future emails
      await tx.postEmailQueue.deleteMany({ where: { userId } });

      // 2. Remove user
      await tx.user.delete({
        where: { id: userId },
      });

      // the rest is onCasecade or SetNull
    });
  }

  /**
   * Schedules a user account for permanent deletion 24 hours from now.
   */
  static async scheduleAccountDeletion(userId: string): Promise<void> {
    const scheduledDeletionAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { scheduledDeletionAt },
    });
  }

  /**
   * Permanently deletes every user whose scheduled deletion timestamp has passed.
   */
  static async deleteScheduledAccounts(): Promise<number> {
    const users = await prisma.user.findMany({
      where: {
        scheduledDeletionAt: {
          lte: new Date(),
        },
      },
      select: { id: true },
    });

    for (const user of users) {
      await prisma.$transaction(async (tx) => {
        await tx.postEmailQueue.deleteMany({ where: { userId: user.id } });
        await tx.initiativeParticipant.deleteMany({
          where: { userId: user.id },
        });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.account.deleteMany({ where: { userId: user.id } });
        await tx.userQualification.deleteMany({ where: { userId: user.id } });
        await tx.user.delete({ where: { id: user.id } });
      });
    }

    return users.length;
  }

  static async getUserQualifications(userId: string) {
    return await prisma.userQualification.findMany({
      where: { userId },
    });
  }

  static async getUserImage(id: string) {
    return await prisma.user.findUnique({
      where: {
        id,
      },
      select: { image: true },
    });
  }

  static async getUsersCount() {
    return await prisma.user.count({
      where: { isActive: true },
    });
  }
}
