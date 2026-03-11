import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Team from "@/components/Team";
import IdeasSlider from "@/components/IdeasSlider";
import Ambassadors from "@/components/Ambassadors";
import Vision from "@/components/Vision";
import Footer from "@/components/Footer";
import { useBranding } from "@/contexts/BrandingContext";

const Index = () => {
  const brand = useBranding();

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <IdeasSlider />
      {brand.id === 'yassu' && <Team />}
      <Ambassadors />
      <Vision />
      {brand.id !== 'yassu' && <Team />}
      <Footer />
    </main>
  );
};

export default Index;
