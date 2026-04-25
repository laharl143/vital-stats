import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/home/Hero";
import Categories from "@/components/home/Categories";
import Legitimacy from "@/components/home/Legitimacy";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CtaBand from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Categories />
        <Legitimacy />
        <FeaturedProducts />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
