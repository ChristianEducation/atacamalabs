"use client";

import { PrimaryLink } from "@/components/ui";
import { track } from "@/lib/analytics";

export function TrackedBookingLink({ href, label }: { href: string; label: string }) {
  return (
    <span onClick={() => track({ name: "booking_click", props: { source: "agenda_page" } })}>
      <PrimaryLink href={href}>{label}</PrimaryLink>
    </span>
  );
}
