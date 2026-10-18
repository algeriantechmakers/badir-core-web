import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

interface UserRemovedEmailProps {
  userName: string;
  adminMessage: string;
  deletionDeadline: string;
  contactUrl: string;
}

export default function UserRemovedEmail({
  userName,
  adminMessage,
  deletionDeadline,
  contactUrl,
}: UserRemovedEmailProps) {
  return (
    <Html dir="rtl" lang="ar">
      <Head />
      <Preview>سيتم حذف حسابك من منصة بادر بعد 24 ساعة</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>منصة بادر</Heading>
            <Text style={subtitle}>حذف الحساب</Text>
          </Section>
          <Section style={content}>
            <Text style={greeting}>مرحباً {userName}،</Text>
            <Text style={paragraph}>
              نود إعلامك بأن حسابك سيُحذف نهائياً من منصة بادر في{" "}
              <strong>{deletionDeadline}</strong> ما لم تتواصل مع فريق الدعم قبل
              هذا الموعد.
            </Text>
            <Section style={messageBox}>
              <Text style={messageTitle}>رسالة الإدارة:</Text>
              <Text style={messageText}>{adminMessage}</Text>
            </Section>
            <Section style={buttonContainer}>
              <Button style={button} href={contactUrl}>
                التواصل للاعتراض
              </Button>
            </Section>
          </Section>
          <Section style={footer}>
            <Text style={footerText}>
              هذه رسالة آلية من منصة بادر. للمساعدة، تواصل معنا على:{" "}
              <a href="mailto:help.badir@gmail.com" style={link}>
                help.badir@gmail.com
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: 'Arial, "Segoe UI", sans-serif',
  padding: "20px 0",
};
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: "8px",
  overflow: "hidden",
};
const header = {
  backgroundColor: "#991B1B",
  padding: "32px 24px",
  textAlign: "center" as const,
};
const heading = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
};
const subtitle = { color: "#FEE2E2", fontSize: "16px", margin: "0" };
const content = { padding: "32px 24px" };
const greeting = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 16px 0",
};
const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#4a5568",
  margin: "0 0 16px 0",
};
const messageBox = {
  backgroundColor: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: "6px",
  padding: "16px",
  margin: "16px 0",
};
const messageTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#991B1B",
  margin: "0 0 8px 0",
};
const messageText = {
  fontSize: "14px",
  color: "#7F1D1D",
  margin: "0",
  lineHeight: "20px",
};
const buttonContainer = { textAlign: "center" as const, margin: "32px 0" };
const button = {
  backgroundColor: "#064E43",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  padding: "14px 32px",
};
const footer = {
  backgroundColor: "#f7fafc",
  padding: "24px",
  borderTop: "1px solid #e2e8f0",
};
const footerText = {
  fontSize: "14px",
  color: "#718096",
  textAlign: "center" as const,
  margin: "8px 0",
};
const link = { color: "#064E43", textDecoration: "underline" };
