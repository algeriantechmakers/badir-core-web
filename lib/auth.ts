import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";
import PasswordResetEmail from "@/emails/PasswordResetEmail";
import { sendMail } from "@/lib/email";
import emailConfig from "@/lib/email";
import { render } from "react-email";
import { runAfterResponse } from "@/lib/background";
import { createAuthMiddleware } from "better-auth/api";

const PASSWORD_RESET_EXPIRY_MINUTES = 15;

const ACTIVE_PATHS = [
  "/sign-in/email",
  "/get-session", // session refresh / tab re-focus
];

export const auth = betterAuth({
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      userType: {
        type: "string",
        required: true,
        defaultValue: "participant",
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
      },
      profileCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      lastActiveAt: {
        type: "date",
        required: false,
        input: false,
        defaultValue: new Date(),
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: PASSWORD_RESET_EXPIRY_MINUTES * 60,
    sendResetPassword: async ({ user, url, token }, request) => {
      const resetLink = url;
      const userName = user.name || user.email.split("@")[0];

      const emailHtml = await render(
        PasswordResetEmail({
          resetLink,
          userName,
          expiryMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
        }),
      );
      const sendEmail = async () => {
        try {
          await sendMail({
            from: emailConfig.fromEmail,
            to: user.email,
            subject: "إعادة تعيين كلمة المرور - منصة بادر",
            html: emailHtml,
          });
        } catch (error) {
          console.error("Failed to send password reset email:", error);
        }
      };

      // Defer the send so the response is not blocked on the mail provider.
      await runAfterResponse(sendEmail());
    },
  },
  secret: process.env.BETTER_AUTH_SECRET as string,
  trustedOrigins: [process.env.BETTER_AUTH_URL as string],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!ACTIVE_PATHS.some((p) => ctx.path.startsWith(p))) return;

      const session = ctx.context.newSession ?? ctx.context.session;
      if (!session?.user?.id) return;

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (session.user.lastActiveAt > oneHourAgo) return;

      // non-blocking
      await ctx.context.runInBackgroundOrAwait(
        prisma.user.update({
          where: { id: session.user.id },
          data: { lastActiveAt: new Date() },
        }),
      );
    }),
  },

  advanced: {
    backgroundTasks: {
      handler: runAfterResponse,
    },
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
