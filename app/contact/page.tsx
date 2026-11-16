import ContactForm from "@/components/pages/contact/ContactForm";
import emailConfig from "@/lib/email-config";

export default function page() {
  return (
    <div className="flex-center-column lg:flex-center container mx-auto px-4 py-8 md:gap-8 lg:flex-row">
      <ContactForm contactEmail={emailConfig.contactEmail} />
    </div>
  );
}
