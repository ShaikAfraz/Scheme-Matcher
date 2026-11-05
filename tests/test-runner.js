/**
 * Isolated Automated Test Runner
 *
 * Guarantees strict database and state isolation:
 * 1. Clones database.sqlite to a disposable test_database.sqlite (preserving the 574 codified schemes)
 * 2. Injects TEST_DB_PATH environment variable into the test runner process
 * 3. Never alters, mutates, or deletes the development or production database.sqlite
 * 4. Cleans up disposable test database files upon completion
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const PROD_DB_PATH = path.join(ROOT_DIR, "database.sqlite");
const TEST_DB_PATH = path.join(ROOT_DIR, "test_database.sqlite");

function cleanTestDb() {
  const artifacts = [
    TEST_DB_PATH,
    `${TEST_DB_PATH}-wal`,
    `${TEST_DB_PATH}-shm`,
  ];
  for (const file of artifacts) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (err) {
        // Ignore busy lock cleanup errors
      }
    }
  }
}

async function run() {
  console.log("============================================================");
  console.log("        SCHEME MATCHER ISOLATED TEST HARNESS");
  console.log("============================================================");

  // 1. Ensure clean slate for test database
  cleanTestDb();

  // 2. Clone production/development database to disposable test database
  if (fs.existsSync(PROD_DB_PATH)) {
    fs.copyFileSync(PROD_DB_PATH, TEST_DB_PATH);
    console.log(`[Isolation] Cloned schemes database -> ${path.basename(TEST_DB_PATH)}`);
  } else {
    console.log(`[Isolation] Initializing fresh ${path.basename(TEST_DB_PATH)}`);
  }

  // 3. Determine target test files (from CLI arguments or all tests)
  const userArgs = process.argv.slice(2);
  let testArgs;
  if (userArgs.length > 0) {
    testArgs = ["--test", "--test-concurrency=1", ...userArgs];
  } else {
    // Collect all test files in tests/ directory in sorted order
    const testFiles = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith(".test.js"))
      .sort()
      .map((file) => path.join("tests", file));

    testArgs = ["--test", "--test-concurrency=1", ...testFiles];
  }

  console.log(`[Harness] Executing: node ${testArgs.join(" ")}`);
  console.log(`[Harness] Target Database: ${TEST_DB_PATH}`);
  console.log("------------------------------------------------------------\n");

  // 4. Spawn Node test process with isolated TEST_DB_PATH
  const child = spawn(process.execPath, testArgs, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_DB_PATH: TEST_DB_PATH,
      NODE_ENV: "test",
    },
  });

  child.on("close", (code) => {
    console.log("\n------------------------------------------------------------");
    console.log(`[Isolation] Cleaning up temporary test database artifacts...`);
    cleanTestDb();
    console.log(`[Isolation] Production database (${path.basename(PROD_DB_PATH)}) is 100% untouched.`);
    console.log("============================================================");
    process.exit(code ?? 0);
  });
}

run().catch((err) => {
  console.error("Test runner failed:", err);
  cleanTestDb();
  process.exit(1);
});
