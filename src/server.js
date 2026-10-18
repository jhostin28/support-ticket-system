// Entry point. The only file that opens a port.
//
// Everything about how the app is configured lives in src/app.js, which tests
// import directly without a server ever listening.

import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});