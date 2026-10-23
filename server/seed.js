import { db, saveUser, saveApplication, getAllUsers } from "./db.js";
import { DEMO_PROFILES } from "../src/data/demoProfiles.js";
import { INITIAL_APPLICATIONS } from "../src/data/appliedSchemes.js";
import { SCHEMES } from "../src/data/schemes.js";
import { importSchemeBatch } from "./pipeline/importer.js";

export function seedDatabaseIfEmpty() {
  const existingUsers = getAllUsers();
  if (existingUsers.length === 0) {
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

  const appCount = db.prepare("SELECT count(*) as count FROM applications").get();
  if (appCount.count === 0) {
    console.log("[Database] Seeding initial scheme applications into SQLite...");
    for (const app of INITIAL_APPLICATIONS) {
      saveApplication(app);
    }
  }

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
