import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const teamMembers = [
  {
    name: "Bob Battista",
    role: "Founder / Northwestern University",
    image: "https://yassu.co/wp-content/uploads/2024/03/pic_bob_battista.png",
    quote: "I believe that anything could be accomplished with will, determination and some form of talent.",
    superpower: "Passion and rigor for strategy",
    hope: "To let ideas flourish and help people get rewarded for their contributions.",
  },
  {
    name: "Kloey Battista",
    role: "Founder / UC Berkeley",
    image: "https://yassu.co/wp-content/uploads/2024/03/pic_kloey_battista-e1711734781360.jpeg",
    quote: "I believe that we all deserve to accomplish our big dreams, and if you dream it, you can create it.",
    superpower: "Building products and pushing the status quo",
    hope: "To provide a new way of access to talented people to collaborate to launch brilliant ideas.",
  },
  {
    name: "Hae Yung Kim",
    role: "Founder / UCLA",
    image: "https://yassu.co/wp-content/uploads/2024/03/pci_hae_3.jpg",
    quote: "I believe everyone deserves the chance to be their best self and achieve their dreams.",
    superpower: "Seeing big opportunities and bringing them to life",
    hope: "To enable and empower everyone to develop their big idea and let the market judge its value.",
  },
  {
    name: "Michael Stamatinos",
    role: "Chief Access Officer",
    image: "https://yassu.co/wp-content/uploads/2024/03/pic_michael_stamatinos_greece.jpg",
    quote: "I believe you're one relationship away from changing the trajectory of your destiny.",
    superpower: "Being a connector and bridge-builder",
    hope: "To elevate society at large, one business idea at a time.",
  },
  {
    name: "Mark Wilson",
    role: "Chief Financial Officer",
    image: "https://yassu.co/wp-content/uploads/2024/04/pic_mark_wilson.jpg",
    quote: "I believe that new business ventures are the purest expression of American meritocracy.",
    superpower: "Supporting future Captains of Industry keep their ships on a steady course",
    hope: "To help drive 'dare to be great' ideas to unimagined success.",
  },
  {
    name: "Ricardo Mazzi",
    role: "Marketing, Partnerships",
    image: "https://yassu.co/wp-content/uploads/2024/04/ricardo_mazzi-scaled-e1714152057994.jpg",
    quote: "I believe commitment, hard work, and consistency allows for results to subsequently flourish.",
    superpower: "Fostering connections and making people smile",
    hope: "For everyone in the world to have an actual opportunity to build upon an idea or dream.",
    imagePosition: "center",
  },
];

const Team = () => {
  return (
    <section id="team" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Yassu <span className="text-gradient">Team</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto italic">
            "The strength of the team is each individual member. The strength of each member is the team."
          </p>
          <p className="text-muted-foreground text-sm mt-2">- Phil Jackson</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center mb-4">
                    <Avatar className="h-32 w-32 mb-4">
                      <AvatarImage 
                        src={member.image} 
                        alt={member.name} 
                        className={`object-cover ${(member as any).imagePosition === "center" ? "object-center" : "object-top"}`} 
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg text-foreground">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground/80 italic mb-3">"{member.quote}"</p>
                  
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-primary font-medium">Superpower:</span>{" "}
                      <span className="text-muted-foreground">{member.superpower}</span>
                    </p>
                    <p>
                      <span className="text-primary font-medium">Hope:</span>{" "}
                      <span className="text-muted-foreground">{member.hope}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-gradient mb-4">
            Dream Big and Achieve Big.
          </h3>
          <p className="text-muted-foreground">
            Contact us at{" "}
            <a href="mailto:hello@yassu.co" className="text-primary hover:underline">
              hello@yassu.co
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Team;
