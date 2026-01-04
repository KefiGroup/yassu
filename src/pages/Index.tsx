import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Team from "@/components/Team";
// import IdeasSlider from "@/components/IdeasSlider";
import Ambassadors from "@/components/Ambassadors";
import Vision from "@/components/Vision";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      {/* <IdeasSlider /> */}
      <Team />
      <Ambassadors />
      <Vision />
      <Footer />
    </main>
  );
};

export default Index;
