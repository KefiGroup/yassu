import { db } from "./db";
import { universities, groups, groupMembers } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

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

  try {
    const existingGroups = await db.select({ count: sql<number>`count(*)::int` }).from(groups);
    const groupCount = Number(existingGroups[0]?.count) || 0;

    if (groupCount === 0) {
      console.log("Seeding Bruin Entrepreneurs group...");
      const uclaRows = await db.select().from(universities).where(eq(universities.shortName, 'UCLA'));
      const uclaId = uclaRows[0]?.id || null;

      const [bruinGroup] = await db.insert(groups).values({
        name: 'Bruin Entrepreneurs',
        slug: 'bruin',
        description: 'UCLA\'s premier entrepreneurship community — connecting student founders, hosting pitch competitions, and building the next generation of startups.',
        primaryColor: '213 69% 38%',
        accentColor: '45 100% 51%',
        universityId: uclaId,
        createdBy: 1,
      }).onConflictDoNothing().returning();

      if (bruinGroup) {
        await db.insert(groupMembers).values({
          groupId: bruinGroup.id,
          userId: 1,
          role: 'owner',
        }).onConflictDoNothing();
        console.log("Seeded Bruin Entrepreneurs group");
      }
    } else {
      console.log(`Groups already seeded (${groupCount} found)`);
    }
  } catch (error) {
    console.error("Error seeding groups:", error);
  }
}
