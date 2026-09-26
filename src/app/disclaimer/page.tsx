import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalSection } from "@/components/LegalPage";
import { DISCLAIMER_VERSION } from "@/lib/legal";

// Changing this text? Bump DISCLAIMER_VERSION in src/lib/legal.ts in the same commit (spec 0001).

export const metadata: Metadata = {
  title: "Medical Disclaimer | VitalStats Philippines",
  description:
    "VitalStats content is general wellness information, not medical advice, and is not a substitute for emergency care.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <LegalPage eyebrow="Disclaimer" title="Medical Disclaimer" version={DISCLAIMER_VERSION}>
      <LegalSection title="Not medical advice">
        <p>
          The information on this website, including product pages, articles and FAQs, is general wellness
          information. It is not medical advice, a diagnosis, or a treatment plan, and it does not replace a
          consultation with your own doctor.
        </p>
      </LegalSection>

      <LegalSection title="Consults and prescription products">
        <p>
          A consult with our clinical team is based on the information you give us. Please make sure it is complete
          and accurate. Medications such as GLP-1 treatments need medical supervision and can have side effects.
          Prescription products are only supplied after a pharmacist has reviewed a valid prescription or consult.
        </p>
      </LegalSection>

      <LegalSection title="Emergencies">
        <p>
          VitalStats is not an emergency service. If you have a medical emergency, call your local emergency number
          or go to the nearest hospital straight away.
        </p>
      </LegalSection>

      <LegalSection title="Results">
        <p>
          Results differ from person to person. Testimonials on this site describe individual experiences and are
          not a promise of the same result.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          If you are unsure whether a product is right for you, <Link href="/book-consult" className="underline" style={{ color: "var(--teal)" }}>book a consult</Link>{" "}
          or ask your doctor.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
