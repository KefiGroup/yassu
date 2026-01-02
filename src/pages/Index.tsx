import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Team from "@/components/Team";
import Ideas from "@/components/Ideas";
import Ambassadors from "@/components/Ambassadors";
import WaitlistForm from "@/components/WaitlistForm";
import Vision from "@/components/Vision";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Team />
      <Ideas />
      <Ambassadors />
      <WaitlistForm />
      <Vision />
      <Footer />
    </main>
  );
};

export default Index;
