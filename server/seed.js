import { db, saveUser, saveApplication, getAllUsers, createOrUpdateAdminAccount } from "./db.js";
import { DEMO_PROFILES } from "../src/data/demoProfiles.js";
import { INITIAL_APPLICATIONS } from "../src/data/appliedSchemes.js";
import { SCHEMES } from "../src/data/schemes.js";
import { importSchemeBatch } from "./pipeline/importer.js";

export function seedDatabaseIfEmpty() {
  // Only seed demo citizens if explicitly requested via environment variable
  if (process.env.SEED_DEMO_CITIZENS === "true") {
    const existingCitizens = db.prepare("SELECT count(*) as count FROM users WHERE system_role = 'citizen'").get().count;
    if (existingCitizens === 0) {
      console.log("[Database] Seeding initial citizen demo personas into SQLite...");
      for (const demo of DEMO_PROFILES) {
        saveUser({
          id: demo.id,
          name: demo.name,
          email: demo.email,
          mobile: demo.mobile,
          password: demo.password,
          avatar: demo.avatar,
          role: demo.role,
          categoryBadge: demo.categoryBadge,
          badgeColor: demo.badgeColor,
          isDemo: true,
          profileData: demo.profileData,
        });
      }
    }
  }

  // Ensure an official Administrator account exists for Yuvraj Choudhary
  const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || "yuvrajc5027@gmail.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "yuvraj1234";
  createOrUpdateAdminAccount({
    email: adminEmail,
    password: adminPassword,
    name: "Yuvraj Choudhary",
    role: "Lead Administrator · Central Directorate of Welfare",
    avatar: "🏛️",
  });

  const schemeCount = db.prepare("SELECT count(*) as count FROM schemes").get();
  if (schemeCount.count < SCHEMES.length) {
    console.log(`[Database] Seeding/expanding official verified schemes into SQLite (current count: ${schemeCount.count}, target: ${SCHEMES.length})...`);
    importSchemeBatch(SCHEMES, { batchName: "Expanded 500+ Verified Government Schemes Catalogue" });
    const newCount = db.prepare("SELECT count(*) as count FROM schemes").get();
    console.log(`[Database] Scheme expansion complete! SQLite now holds ${newCount.count} verified schemes.`);
  }

  console.log("[Database] Database seeding check complete. Ready for real-time operations!");
}

seedDatabaseIfEmpty();
