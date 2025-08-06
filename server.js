const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Admin emails (should match your admin.js file)
const adminEmails = [
  'mahmoudadil2001@gmail.com',
  'mahmod.adil2001@gmail.com' // Add your other admin emails here
];

// Admin middleware
function requireAdmin(req, res, next) {
  const { userEmail } = req.body;
  if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Admin endpoint to save files
app.post('/admin/save-file', requireAdmin, async (req, res) => {
  try {
    const { filePath, content } = req.body;

    // Security check - only allow certain file types and paths
    const allowedExtensions = ['.js'];
    const allowedPaths = ['show.js', 'lectureNames.js'];
    const isVersionFile = /^[a-z]+\/[a-z]+\d+\/[a-z]+\d+_v\d+\.js$/.test(filePath);

    if (!allowedPaths.includes(filePath) && !isVersionFile) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const ext = path.extname(filePath);
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Create directory if it doesn't exist (for version files)
    if (isVersionFile) {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
    }

    // Write file
    await fs.writeFile(filePath, content, 'utf8');

    res.json({ success: true, message: 'File saved successfully' });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Admin endpoint to delete files
app.delete('/admin/delete-file', requireAdmin, async (req, res) => {
  try {
    const { filePath } = req.body;

    // Security check - only allow deletion of version files
    const isVersionFile = /^[a-z]+\/[a-z]+\d+\/[a-z]+\d+_v\d+\.js$/.test(filePath);

    if (!isVersionFile) {
      return res.status(400).json({ error: 'Can only delete version files' });
    }

    await fs.unlink(filePath);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Admin endpoint to create directories
app.post('/admin/create-directory', requireAdmin, async (req, res) => {
  try {
    const { dirPath } = req.body;

    // Security check - only allow subject/lecture directories
    const isValidDir = /^[a-z]+\/[a-z]+\d+$/.test(dirPath);

    if (!isValidDir) {
      return res.status(400).json({ error: 'Invalid directory path' });
    }

    await fs.mkdir(dirPath, { recursive: true });

    res.json({ success: true, message: 'Directory created successfully' });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: 'Failed to create directory' });
  }
});

// Admin endpoint to list files in a directory
app.post('/admin/list-files', requireAdmin, async (req, res) => {
  try {
    const { dirPath } = req.body;

    // Security check
    const isValidDir = /^[a-z]+\/?([a-z]+\d+\/?)?$/.test(dirPath);

    if (!isValidDir) {
      return res.status(400).json({ error: 'Invalid directory path' });
    }

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const fileList = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      type: file.isDirectory() ? 'directory' : path.extname(file.name)
    }));

    res.json({ success: true, files: fileList });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server running at http://0.0.0.0:${PORT}`);
  console.log('Your dental exam MCQ app is now accessible!');
});