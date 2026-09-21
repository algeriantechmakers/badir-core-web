import { NextRequest, NextResponse } from "next/server";
import PostNotificationEmail from "@/emails/PostNotificationEmail";
import FeedbackReceivedEmail from "@/emails/FeedbackReceivedEmail";
import ContactMessageEmail from "@/emails/ContactMessageEmail";
import emailConfig, { sendMail } from "@/lib/email";
import { render } from "react-email";

// ? password-reset is excluded from here as it's handled directly in lib/auth.ts to wait for the background email to be sent before terminating the function
type EmailType = "post-notification" | "feedback" | "contact";

interface BaseEmailRequest {
  type: EmailType;
  to: string;
}

interface PostNotificationRequest extends BaseEmailRequest {
  type: "post-notification";
  data: {
    postTitle: string;
    authorName: string;
    postExcerpt?: string;
    postUrl: string;
    categoryName?: string;
  };
}

interface FeedbackRequest extends BaseEmailRequest {
  type: "feedback";
  data: {
    userName?: string;
    userEmail?: string;
    easeOfUse?: string;
    informationClarity?: string;
    contentDiversity?: string;
    performanceSpeed?: string;
    generalSatisfaction?: string;
    encounteredDifficulties?: string;
    difficultiesDetails?: string;
    improvementSuggestions?: string;
    wouldRecommend?: string;
    appRating?: string;
    timestamp: string;
  };
}

interface ContactRequest extends BaseEmailRequest {
  type: "contact";
  data: {
    fullName: string;
    email: string;
    inquiryType: string;
    title: string;
    message: string;
    timestamp: string;
  };
}

type EmailRequest = PostNotificationRequest | FeedbackRequest | ContactRequest;

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json();

    if (!body.type || !body.to) {
      return NextResponse.json(
        { error: "Missing required fields: type and to" },
        { status: 400 },
      );
    }

    if (!process.env.SMTP_HOST) {
      console.error("SMTP_HOST is not configured");
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 },
      );
    }

    const fromEmail = emailConfig.fromEmail;

    switch (body.type) {
      case "post-notification": {
        const { postTitle, authorName, postExcerpt, postUrl, categoryName } =
          body.data;

        const emailHtml = await render(
          PostNotificationEmail({
            postTitle,
            authorName,
            postExcerpt,
            postUrl,
            categoryName,
          }),
        );

        const info = await sendMail({
          from: `منصة بادر <${fromEmail}>`,
          to: body.to,
          subject: `منشور جديد: ${postTitle}`,
          html: emailHtml,
        });

        return NextResponse.json(
          {
            success: true,
            messageId: info.messageId,
            message: "Email sent successfully",
          },
          { status: 200 },
        );
      }

      case "feedback": {
        const feedbackData = body.data;

        const emailHtml = await render(FeedbackReceivedEmail(feedbackData));

        const info = await sendMail({
          from: `منصة بادر <${fromEmail}>`,
          to: body.to,
          subject: "تقييم حرج للمنصة - يتطلب متابعة فورية",
          html: emailHtml,
        });

        return NextResponse.json(
          {
            success: true,
            messageId: info.messageId,
            message: "Email sent successfully",
          },
          { status: 200 },
        );
      }

      case "contact": {
        const { fullName, email, inquiryType, title, message, timestamp } =
          body.data;

        const emailHtml = await render(
          ContactMessageEmail({
            fullName,
            email,
            inquiryType,
            title,
            message,
            timestamp,
          }),
        );

        const info = await sendMail({
          from: `منصة بادر <${fromEmail}>`,
          to: body.to,
          subject: `رسالة تواصل جديدة: ${title}`,
          replyTo: email,
          html: emailHtml,
        });

        return NextResponse.json(
          {
            success: true,
            messageId: info.messageId,
            message: "Email sent successfully",
          },
          { status: 200 },
        );
      }

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
