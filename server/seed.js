import { db, saveUser, saveApplication, getAllUsers } from "./db.js";
import { DEMO_PROFILES } from "../src/data/demoProfiles.js";
import { INITIAL_APPLICATIONS } from "../src/data/appliedSchemes.js";
import { SCHEMES } from "../src/data/schemes.js";

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
  if (schemeCount.count === 0) {
    console.log("[Database] Seeding official government schemes into SQLite...");
    const insertScheme = db.prepare(`
      INSERT INTO schemes (
        id, name, ministry, description, categories, min_age, max_age,
        income_limit, states, business_status, business_types, min_req, max_req,
        benefits, documents, application_steps, portal_url
      ) VALUES (
        @id, @name, @ministry, @description, @categories, @min_age, @max_age,
        @income_limit, @states, @business_status, @business_types, @min_req, @max_req,
        @benefits, @documents, @application_steps, @portal_url
      )
    `);

    for (const s of SCHEMES) {
      insertScheme.run({
        id: s.id,
        name: s.name,
        ministry: s.ministry,
        description: s.description,
        categories: JSON.stringify(s.categories),
        min_age: s.minAge || 18,
        max_age: s.maxAge || 100,
        income_limit: s.incomeLimit,
        states: JSON.stringify(s.states),
        business_status: JSON.stringify(s.businessStatus),
        business_types: JSON.stringify(s.businessTypes),
        min_req: s.minReq,
        max_req: s.maxReq,
        benefits: s.benefits,
        documents: JSON.stringify(s.documents),
        application_steps: JSON.stringify(s.applicationSteps || []),
        portal_url: s.portalUrl || s.source,
      });
    }
  }

  console.log("[Database] Database seeding check complete. Ready for real-time operations!");
}

seedDatabaseIfEmpty();
