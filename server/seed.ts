import { db } from "./db";
import { universities } from "../shared/schema";
import { sql } from "drizzle-orm";

const UNIVERSITIES_DATA = [
  { name: "Brown University", shortName: "Brown", domain: "brown.edu" },
  { name: "Carnegie Mellon University", shortName: "CMU", domain: "cmu.edu" },
  { name: "Columbia University", shortName: "Columbia", domain: "columbia.edu" },
  { name: "Cornell University", shortName: "Cornell", domain: "cornell.edu" },
  { name: "Dartmouth College", shortName: "Dartmouth", domain: "dartmouth.edu" },
  { name: "Duke University", shortName: "Duke", domain: "duke.edu" },
  { name: "Georgia Tech", shortName: "GT", domain: "gatech.edu" },
  { name: "Harvard University", shortName: "Harvard", domain: "harvard.edu" },
  { name: "MIT", shortName: "MIT", domain: "mit.edu" },
  { name: "Northwestern University", shortName: "Northwestern", domain: "northwestern.edu" },
  { name: "Princeton University", shortName: "Princeton", domain: "princeton.edu" },
  { name: "Stanford University", shortName: "Stanford", domain: "stanford.edu" },
  { name: "UC Berkeley", shortName: "Berkeley", domain: "berkeley.edu" },
  { name: "UCLA", shortName: "UCLA", domain: "ucla.edu" },
  { name: "University of Chicago", shortName: "UChicago", domain: "uchicago.edu" },
  { name: "University of Michigan", shortName: "UMich", domain: "umich.edu" },
  { name: "University of Pennsylvania", shortName: "UPenn", domain: "upenn.edu" },
  { name: "University of Texas at Austin", shortName: "UT Austin", domain: "utexas.edu" },
  { name: "University of Washington", shortName: "UW", domain: "uw.edu" },
  { name: "Yale University", shortName: "Yale", domain: "yale.edu" },
];

export async function seedDatabase(): Promise<void> {
  try {
    const existingCount = await db.select({ count: sql<number>`count(*)::int` }).from(universities);
    const count = Number(existingCount[0]?.count) || 0;
    
    if (count === 0) {
      console.log("Seeding universities...");
      
      for (const uni of UNIVERSITIES_DATA) {
        try {
          await db.insert(universities).values({
            id: crypto.randomUUID(),
            name: uni.name,
            shortName: uni.shortName,
            domain: uni.domain,
          }).onConflictDoNothing();
        } catch (insertError) {
          console.error(`Failed to insert ${uni.name}:`, insertError);
        }
      }
      
      console.log(`Seeded ${UNIVERSITIES_DATA.length} universities`);
    } else {
      console.log(`Universities already seeded (${count} found)`);
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
