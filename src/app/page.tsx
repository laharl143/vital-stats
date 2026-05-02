import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import Categories from "@/components/home/Categories";
import HowItWorks from "@/components/home/HowItWorks";
import Legitimacy from "@/components/home/Legitimacy";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import BeforeAfter from "@/components/home/BeforeAfter";
import Testimonials from "@/components/home/Testimonials";
import Team from "@/components/home/Team";
import FAQ from "@/components/home/FAQ";
import CtaBand from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Categories />
        <HowItWorks />
        <Legitimacy />
        <FeaturedProducts />
        <BeforeAfter />
        <Testimonials />
        <Team />
        <FAQ />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
