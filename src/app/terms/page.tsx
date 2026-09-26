import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection, Placeholder } from "@/components/LegalPage";
import { TERMS_VERSION } from "@/lib/legal";

// Changing this text? Bump TERMS_VERSION in src/lib/legal.ts in the same commit (spec 0001).

export const metadata: Metadata = {
  title: "Terms of Use | VitalStats Philippines",
  description:
    "The terms for using the VitalStats website, booking a consult, and ordering products, including payment, delivery, prescriptions and refunds.",
  alternates: { canonical: "/terms" },
};

const linkStyle = { color: "var(--teal)" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Terms" title="Terms of Use" version={TERMS_VERSION}>
      <LegalSection title="About these terms">
        <p>
          These terms apply when you use this website, book a consult, or order from VitalStats Philippines
          (<Placeholder>registered business name and address</Placeholder>). By placing an order or submitting a
          form you agree to them. How we handle your information is explained in our{" "}
          <Link href="/privacy" className="underline" style={linkStyle}>Privacy Notice</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Ordering">
        <LegalList
          items={[
            "You can order as a guest. An account is optional.",
            "Please give an accurate name, phone number and delivery address. We are not responsible for a delivery that fails because of wrong details.",
            "Your order is confirmed once we accept it. We may refuse or cancel an order, for example when a product is out of stock, a prescription is not approved, or the order looks fraudulent. You get a full refund of anything you paid in that case.",
            "Prices are in Philippine pesos and include the taxes shown at checkout. Shipping fees are shown before you pay.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Payment">
        <LegalList
          items={[
            "You can pay online (card or e wallet) at checkout, or choose cash on delivery where it is offered.",
            "Online payments are processed by our payment provider. We never see or store your full card details.",
            "Cash on delivery orders are confirmed by our team before they are shipped.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Stock">
        <p>
          We check stock when you check out, but stock is only reserved once our team allocates it after your order
          is placed. If an item turns out to be unavailable, we cancel that order and refund you in full.
        </p>
      </LegalSection>

      <LegalSection title="Products that need a prescription">
        <LegalList
          items={[
            "Some products can only be supplied with a valid prescription. At checkout you either upload one or book a consult.",
            "You pay at checkout. Our pharmacist then reviews the prescription or consult before the order ships.",
            "If the pharmacist does not approve it, we cancel the order and refund you in full.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Delivery">
        <p>
          We ship through third party couriers. Delivery times shown are estimates. Some products must be kept cold
          and can only be shipped to areas a suitable courier covers. Please check your order when it arrives and
          tell us within <Placeholder>number of days</Placeholder> if anything is wrong.
        </p>
      </LegalSection>

      <LegalSection title="Cancellations and refunds">
        <LegalList
          items={[
            "If we cancel or reject your order for any reason, you get a full refund to your original payment method.",
            "Partial refunds and returns are not offered yet. If there is a problem with your order, contact us and we will help.",
            <>Refunds usually reach you within <Placeholder>refund timeline</Placeholder>, depending on your bank or e wallet.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Health information">
        <p>
          Content on this site is general information, not medical advice. Please read our{" "}
          <Link href="/disclaimer" className="underline" style={linkStyle}>Medical Disclaimer</Link>. Always follow the
          advice of your own doctor.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          To the extent the law allows, we are not liable for indirect losses, or for losses caused by events outside
          our reasonable control. Nothing in these terms limits your rights under the Consumer Act of the Philippines
          (RA 7394).
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms. The version and date above show which terms apply; an order is governed by the
          version in force when it was placed. Questions? <Link href="/contact" className="underline" style={linkStyle}>Contact us</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
