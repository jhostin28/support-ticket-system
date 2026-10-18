// Runs before any test file.
//
// Loads .env.test over .env, which is what swaps the database. The override
// flag matters: dotenv does not replace variables that are already set.

import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', override: true });

