// Runs before any test file.
//
// Loads .env.test over .env locally. In CI there is no .env.test — the
// variables come from the workflow — and dotenv simply finds nothing, which
// is fine.

import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', override: true });