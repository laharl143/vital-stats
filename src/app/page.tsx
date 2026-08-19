import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminShortcut from "@/components/AdminShortcut";
import DesignSystemShortcut from "@/components/DesignSystemShortcut";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import Categories from "@/components/home/Categories";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import BeforeAfter from "@/components/home/BeforeAfter";
import Testimonials from "@/components/home/Testimonials";
import Team from "@/components/home/Team";
import FAQ from "@/components/home/FAQ";

export default function HomePage() {
  return (
    <>
      <AdminShortcut />
      <DesignSystemShortcut />
      <div style={{ zoom: 1.1 }}>
        <Navbar />
        <main>
          <Hero />
          <TrustBar />
          <Categories />
          <HowItWorks />
          <FeaturedProducts />
          {/* <BeforeAfter /> */}
          <Testimonials />
          <Team />
          <FAQ />
        </main>
        <Footer />
      </div>
    </>
  );
}
