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

export default function EmailVerificationEmail({
  verificationLink,
  userName,
}: {
  verificationLink: string;
  userName: string;
}) {
  return (
    <Html dir="rtl">
      <Head />
      <Preview>تحقق من بريدك الإلكتروني في منصة بادر</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.heading}>منصة بادر</Heading>
          </Section>
          <Section style={styles.content}>
            <Text style={styles.greeting}>مرحباً {userName}،</Text>
            <Text style={styles.paragraph}>
              يرجى التحقق من بريدك الإلكتروني للمتابعة في منصة بادر.
            </Text>
            <Section style={styles.buttonContainer}>
              <Button href={verificationLink} style={styles.button}>
                تحقق من البريد الإلكتروني
              </Button>
            </Section>
            <Text style={styles.paragraph}>
              هذا الرابط صالح لمدة ساعة ونصف. إذا لم تنشئ هذا الحساب، يمكنك
              تجاهل هذه الرسالة.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: 'Arial, "Segoe UI", sans-serif',
    padding: "20px 0",
  },
  container: {
    backgroundColor: "#F9F7F3",
    margin: "0 auto",
    maxWidth: "600px",
  },
  header: {
    backgroundColor: "#064E43",
    padding: "32px 24px",
    textAlign: "center" as const,
  },
  heading: {
    color: "#ffffff",
    fontSize: "28px",
    margin: "0",
  },
  content: {
    padding: "32px 24px",
  },
  greeting: {
    color: "#1a1a1a",
    fontSize: "18px",
    fontWeight: "600",
  },
  paragraph: {
    color: "#4a5568",
    fontSize: "16px",
    lineHeight: "24px",
  },
  buttonContainer: {
    padding: "16px 0 24px",
    textAlign: "center" as const,
  },
  button: {
    backgroundColor: "#064E43",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    padding: "14px 32px",
    textDecoration: "none",
  },
};
