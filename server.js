
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404s by serving index.html (for client-side routing if needed)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
