import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection, Placeholder } from "@/components/LegalPage";
import { PRIVACY_VERSION } from "@/lib/legal";

// Changing this text? Bump PRIVACY_VERSION in src/lib/legal.ts in the same commit (spec 0001).

export const metadata: Metadata = {
  title: "Privacy Notice | VitalStats Philippines",
  description:
    "How VitalStats collects, uses, shares and protects your personal and health information under the Data Privacy Act of 2012 (RA 10173).",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Notice" version={PRIVACY_VERSION}>
      <LegalSection title="Who we are">
        <p>
          VitalStats Philippines (&ldquo;VitalStats&rdquo;, &ldquo;we&rdquo;) runs this website and decides how the
          personal information you give us is used. Under the Data Privacy Act of 2012 (RA 10173) we are the
          personal information controller for that information.
        </p>
        <p>
          Registered business name and address: <Placeholder>registered business name and address</Placeholder>
        </p>
        <p>
          Data Protection Officer: <Placeholder>DPO name, email and phone</Placeholder>. Until then you can reach us
          through the <Link href="/contact" className="underline" style={{ color: "var(--teal)" }}>contact page</Link>,
          by phone or Viber at 09278608705, or on Facebook at facebook.com/vitalstatswellness.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <LegalList
          items={[
            <><strong>Identity and contact details</strong>: your name, date of birth, sex, phone number, email address, or Facebook name.</>,
            <><strong>Delivery details</strong>: your delivery address and any delivery notes, when you order.</>,
            <><strong>Health information</strong>: height, weight, BMI, waist size, smoking and drinking habits, medical conditions, pregnancy status, surgeries, medications and allergies, when you book a consult. Prescriptions, when you order a product that needs one. The law treats health information as sensitive personal information.</>,
            <><strong>Order details</strong>: the products you order, amounts, payment method and order status. We do not store your card details; the payment provider handles them.</>,
            <><strong>Messages</strong>: what you write to us through the contact form or our other channels.</>,
            <><strong>Technical details</strong>: your IP address, used to limit spam and repeated submissions.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Why we use it, and on what basis">
        <LegalList
          items={[
            <><strong>To assess your consult</strong> and design a suitable program. Basis: your consent, given on the consult form, because this is health information.</>,
            <><strong>To process and deliver your order</strong>, take payment, and handle cancellations and refunds. Basis: our contract with you.</>,
            <><strong>To review a prescription</strong> for a product that needs one. Basis: your consent, given before you upload it.</>,
            <><strong>To answer your questions</strong> and send updates about your consult or order. Basis: your request and our contract with you.</>,
            <><strong>To keep records</strong> that tax and health regulations require. Basis: legal obligation.</>,
            <><strong>To keep the site safe</strong> from spam and abuse. Basis: our legitimate interest.</>,
          ]}
        />
        <p>We do not sell your information, and we do not use it for advertising.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>Only with the people and services we need to run the service, each for the purpose above:</p>
        <LegalList
          items={[
            "Our clinical team and pharmacist, to review consults and prescriptions.",
            "Our order management system, which our staff use to check stock, pack and ship your order.",
            "Couriers (such as Lalamove or J&T Express), who receive your name, phone number and delivery address.",
            "Our payment provider, which processes online payments.",
            "Google (Apps Script and Sheets), where our team keeps a working copy of consult requests.",
            "Resend, which sends our emails.",
            "Supabase and Vercel, which host our database and website.",
            "Vercel Analytics, which counts page visits without cookies. It sees request details such as your IP address, but we do not use it to identify you.",
            "Government authorities, only when the law requires it.",
          ]}
        />
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your information only as long as the purpose needs it or the law requires. Consult records:{" "}
          <Placeholder>retention period</Placeholder>. Order and payment records:{" "}
          <Placeholder>retention period required by tax rules</Placeholder>. Contact messages:{" "}
          <Placeholder>retention period</Placeholder>. After that we delete it or make it anonymous.
        </p>
      </LegalSection>

      <LegalSection title="How we protect it">
        <p>
          Your information is sent over encrypted connections and stored in access controlled systems. Only staff who
          need it for their work can see it, and health information is limited to our clinical team and pharmacist.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>Under RA 10173 you have the right to:</p>
        <LegalList
          items={[
            "be informed about how your information is used (this notice);",
            "access the information we hold about you;",
            "correct information that is wrong or out of date;",
            "object to processing, and withdraw consent you gave (this does not undo processing already done);",
            "have your information erased or blocked when it is no longer needed or was processed unlawfully;",
            "get a copy of your information in a common electronic format;",
            "be compensated for damage caused by misuse of your information;",
            "file a complaint with the National Privacy Commission (privacy.gov.ph).",
          ]}
        />
        <p>
          To use any of these rights, contact our Data Protection Officer (above). We will reply within{" "}
          <Placeholder>response time</Placeholder>.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this notice">
        <p>
          When we change this notice we publish the new version here with a new date. Each form records the version
          you agreed to.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
