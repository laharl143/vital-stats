import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminShortcut from "@/components/AdminShortcut";
import DesignSystemShortcut from "@/components/DesignSystemShortcut";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import Categories from "@/components/home/Categories";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Testimonials from "@/components/home/Testimonials";
import Team from "@/components/home/Team";
import FAQ from "@/components/home/FAQ";

export default function HomePage() {
  return (
    <>
      <AdminShortcut />
      <DesignSystemShortcut />
      {/* zoom shrinks effective layout width (real ÷ zoom factor), so md:
          starved the Navbar and spilled the CTA past the pill. xl: leaves
          enough room. */}
      <div className="xl:[zoom:1.1]">
        <Navbar />
        <main>
          <Hero />
          <TrustBar />
          <Categories />
          <HowItWorks />
          <FeaturedProducts />
          <Testimonials />
          <Team />
          <FAQ />
        </main>
        <Footer />
      </div>
    </>
  );
}
