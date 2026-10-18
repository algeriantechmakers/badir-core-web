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

interface OrganizationRemovedEmailProps {
  orgName: string;
  adminMessage: string;
  deletionDeadline: string;
  contactUrl: string;
}

export default function OrganizationRemovedEmail({
  orgName,
  adminMessage,
  deletionDeadline,
  contactUrl,
}: OrganizationRemovedEmailProps) {
  return (
    <Html dir="rtl" lang="ar">
      <Head />
      <Preview>
        تم حذف منظمتك &quot;{orgName}&quot; وسيتم حذف حسابك بعد 24 ساعة ما لم
        تتواصل مع الدعم
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>منصة بادر</Heading>
            <Text style={subtitle}>حذف المنظمة</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>مرحباً،</Text>
            <Text style={paragraph}>
              نود إعلامك بأنه تم حذف منظمتك{" "}
              <strong>&quot;{orgName}&quot;</strong> من منصة بادر.
            </Text>

            <Section style={messageBox}>
              <Text style={messageTitle}>رسالة الإدارة:</Text>
              <Text style={messageText}>{adminMessage}</Text>
            </Section>

            <Text style={warningNote}>
              سيتم حذف حساب المستخدم الخاص بك نهائياً في{" "}
              <strong>{deletionDeadline}</strong> ما لم تتواصل مع فريق الدعم قبل
              هذا الموعد.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={contactUrl}>
                التواصل مع الدعم
              </Button>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              هذه رسالة آلية من منصة بادر. يرجى عدم الرد على هذا البريد
              الإلكتروني.
            </Text>
            <Text style={footerText}>
              للمساعدة، تواصل معنا على:{" "}
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
  padding: "0",
  maxWidth: "600px",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
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

const subtitle = {
  color: "#FEE2E2",
  fontSize: "16px",
  margin: "0",
};

const content = {
  padding: "32px 24px",
};

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

const warningNote = {
  backgroundColor: "#FFF7ED",
  border: "1px solid #FDBA74",
  borderRadius: "6px",
  padding: "16px",
  fontSize: "14px",
  color: "#9A3412",
  lineHeight: "22px",
  margin: "24px 0",
};

const englishSection = {
  borderTop: "1px solid #e2e8f0",
  marginTop: "24px",
  paddingTop: "20px",
  direction: "ltr" as const,
};

const englishText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#4a5568",
  margin: "0 0 12px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#064E43",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
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

const link = {
  color: "#064E43",
  textDecoration: "underline",
};
