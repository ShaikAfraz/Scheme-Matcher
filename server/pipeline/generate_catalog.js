/**
 * SCHEME CATALOGUE GENERATOR SCRIPT
 * Generates verified, structured batches for Central Ministries, National/State Scholarships,
 * Agriculture & Allied Welfare, and State Citizen Programmes across all zones.
 * Each scheme strictly adheres to the Scheme Matcher schema and official government guidelines.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log("[Generator] Scheme catalogue generator initialized. Target directory:", DATA_DIR);
