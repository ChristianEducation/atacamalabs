import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, PrimaryLink, Card } from "@/components/ui";
import site from "@/lib/content";

export const metadata: Metadata = {
  title: "Agenda | Atacama Labs",
  description: site.contact.meetingTitle,
};

export default function Agenda() {
  const bookingUrl = site.publicSettings.bookingUrl;

  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container className="max-w-[70ch]">
          <h1 className="text-4xl font-semibold text-ink md:text-5xl">
            {site.contact.meetingTitle}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            {site.contact.meetingBody}
          </p>

          {bookingUrl ? (
            <div className="mt-10">
              <PrimaryLink href={bookingUrl}>Reservar horario</PrimaryLink>
            </div>
          ) : (
            <Card className="mt-10">
              <p className="text-base leading-7 text-ink">
                La agenda en línea todavía no está conectada. Escríbenos
                contándonos tu proceso y coordinamos un horario por el canal
                que prefieras — esto no reserva la reunión automáticamente.
              </p>
              <div className="mt-5">
                <PrimaryLink href="/contacto">Escribir un mensaje</PrimaryLink>
              </div>
            </Card>
          )}
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
