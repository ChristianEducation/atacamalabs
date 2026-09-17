import site from "@/lib/content";
import { ContactFormClient } from "@/components/ContactFormClient";

export function ContactForm(props: {
  initialSolution?: string;
  initialMessage?: string;
}) {
  const content = {
    contact: {
      success: site.contact.success,
      notice: site.contact.notice,
      submitLabel: site.contact.submitLabel,
    },
    publicSettings: { contactEmail: site.publicSettings.contactEmail },
    solutions: site.solutions.map(({ slug, title }) => ({ slug, title })),
  };
  return <ContactFormClient {...props} content={content} />;
}
