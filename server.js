const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));
// Serve static client application from frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// Multer storage configuration
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'resume-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Initialize DatabaseSync
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new DatabaseSync(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'SuperAdmin'
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    college TEXT NOT NULL,
    department TEXT NOT NULL,
    cgpa REAL NOT NULL,
    graduation TEXT NOT NULL,
    registeredAt TEXT NOT NULL,
    testStatus TEXT DEFAULT 'pending',
    interviewStatus TEXT DEFAULT 'pending',
    resumeName TEXT,
    resumeSize TEXT,
    resumeType TEXT,
    resumeUploadedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS results (
    candidateId TEXT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
    correct INTEGER NOT NULL,
    wrong INTEGER NOT NULL,
    skipped INTEGER NOT NULL,
    total INTEGER NOT NULL,
    score INTEGER NOT NULL,
    qualified INTEGER NOT NULL,
    submittedAt TEXT NOT NULL,
    timeTaken INTEGER NOT NULL,
    violations INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    candidateId TEXT UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
    candidateName TEXT NOT NULL,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    mode TEXT NOT NULL,
    bookedAt TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled'
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON stringified array
    answer INTEGER NOT NULL, -- index (0-3)
    explanation TEXT
  );

  CREATE TABLE IF NOT EXISTS responses (
    candidateId TEXT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
    answers TEXT NOT NULL, -- JSON stringified array of responses
    submittedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    toEmail TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sentAt TEXT NOT NULL,
    read INTEGER DEFAULT 0
  );
`);

// Seed Admin User
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get().count;
if (adminCount === 0) {
  db.prepare('INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)')
    .run('admin@jkpvtltd.com', 'JKAdmin@2025', 'SuperAdmin');
  console.log('Seeded default admin user: admin@jkpvtltd.com');
}

// Seed Questions Bank
const qCount = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
if (qCount === 0) {
  try {
    const { QUESTION_BANK } = require('./frontend/questions.js');
    const insertQ = db.prepare('INSERT INTO questions (category, subcategory, question, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?)');
    for (const q of QUESTION_BANK) {
      insertQ.run(q.category, q.subcategory, q.question, JSON.stringify(q.options), q.answer, q.explanation || '');
    }
    console.log(`Seeded ${QUESTION_BANK.length} default questions in database.`);
  } catch (err) {
    console.error('Error seeding questions:', err);
  }
}

// Helper to format candidate row
function formatCandidate(row) {
  if (!row) return null;
  const c = { ...row };
  if (c.resumeName) {
    c.resume = {
      name: c.resumeName,
      size: c.resumeSize,
      type: c.resumeType,
      uploadedAt: c.resumeUploadedAt
    };
  } else {
    c.resume = null;
  }
  delete c.resumeName;
  delete c.resumeSize;
  delete c.resumeType;
  delete c.resumeUploadedAt;
  return c;
}

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Fetch entire database state (Sync Cache)
app.get('/api/db', (req, res) => {
  try {
    const candidatesRaw = db.prepare('SELECT * FROM candidates').all();
    const results = db.prepare('SELECT * FROM results').all();
    const interviews = db.prepare('SELECT * FROM interviews').all();
    const questionsRaw = db.prepare('SELECT * FROM questions').all();
    const responsesRaw = db.prepare('SELECT * FROM responses').all();
    const emailsRaw = db.prepare('SELECT * FROM emails').all();
    const admin_users = db.prepare('SELECT * FROM admin_users').all();

    // Format output to match local storage structure
    const candidates = candidatesRaw.map(formatCandidate);
    
    const questions = questionsRaw.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    const responses = responsesRaw.map(r => ({
      ...r,
      answers: JSON.parse(r.answers)
    }));

    const emails = emailsRaw.map(e => ({
      id: e.id,
      to: e.toEmail,
      subject: e.subject,
      body: e.body,
      sentAt: e.sentAt,
      read: e.read === 1
    }));

    res.json({
      candidates,
      results,
      interviews,
      questions,
      responses,
      emails,
      admin_users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database sync fetch failed' });
  }
});

// 2. Candidate Registration with Resume Upload
app.post('/api/register', upload.single('resume'), (req, res) => {
  try {
    const { id, fullName, email, phone, college, department, cgpa, graduation, registeredAt } = req.body;
    
    // Check if email already exists
    const existing = db.prepare('SELECT id FROM candidates WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let resumeName = null, resumeSize = null, resumeType = null, resumeUploadedAt = null;
    if (req.file) {
      resumeName = req.file.filename;
      resumeSize = (req.file.size / 1024).toFixed(1) + ' KB';
      resumeType = req.file.mimetype;
      resumeUploadedAt = new Date().toISOString();
    }

    db.prepare(`
      INSERT INTO candidates (id, fullName, email, phone, college, department, cgpa, graduation, registeredAt, resumeName, resumeSize, resumeType, resumeUploadedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      fullName,
      email.toLowerCase(),
      phone,
      college,
      department,
      parseFloat(cgpa),
      graduation,
      registeredAt,
      resumeName,
      resumeSize,
      resumeType,
      resumeUploadedAt
    );

    const inserted = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    res.json(formatCandidate(inserted));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Candidate registration failed' });
  }
});

// 3. Candidate Login via Email
app.post('/api/login', (req, res) => {
  try {
    const { email } = req.body;
    const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email.toLowerCase());
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate account not found' });
    }
    res.json(formatCandidate(candidate));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login verification failed' });
  }
});

// 4. Update Candidate details
app.post('/api/candidates/update', (req, res) => {
  try {
    const { id, interviewStatus, testStatus } = req.body;
    
    if (interviewStatus !== undefined && testStatus !== undefined) {
      db.prepare('UPDATE candidates SET interviewStatus = ?, testStatus = ? WHERE id = ?').run(interviewStatus, testStatus, id);
    } else if (interviewStatus !== undefined) {
      db.prepare('UPDATE candidates SET interviewStatus = ? WHERE id = ?').run(interviewStatus, id);
    } else if (testStatus !== undefined) {
      db.prepare('UPDATE candidates SET testStatus = ? WHERE id = ?').run(testStatus, id);
    }
    
    const updated = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    res.json(formatCandidate(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// 5. Replace candidate resume
app.post('/api/candidates/:id/resume', upload.single('resume'), (req, res) => {
  try {
    const { id } = req.params;
    
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    // Delete old resume file if it exists
    if (candidate.resumeName) {
      const oldPath = path.join(uploadsDir, candidate.resumeName);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.error('Failed deleting old resume file:', e); }
      }
    }

    const resumeName = req.file.filename;
    const resumeSize = (req.file.size / 1024).toFixed(1) + ' KB';
    const resumeType = req.file.mimetype;
    const resumeUploadedAt = new Date().toISOString();

    db.prepare(`
      UPDATE candidates 
      SET resumeName = ?, resumeSize = ?, resumeType = ?, resumeUploadedAt = ?
      WHERE id = ?
    `).run(resumeName, resumeSize, resumeType, resumeUploadedAt, id);

    const updated = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    res.json(formatCandidate(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to replace resume' });
  }
});

// 6. Persist email log (notification sync)
app.post('/api/emails', (req, res) => {
  try {
    const { id, to, subject, body, sentAt, read } = req.body;
    db.prepare(`
      INSERT INTO emails (id, toEmail, subject, body, sentAt, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, to, subject, body, sentAt, read ? 1 : 0);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save email' });
  }
});

// 7. Mark emails as read
app.post('/api/emails/read', (req, res) => {
  try {
    const { toEmail } = req.body;
    db.prepare('UPDATE emails SET read = 1 WHERE toEmail = ?').run(toEmail);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update email status' });
  }
});

// 8. Submit Test results
app.post('/api/test/submit', (req, res) => {
  try {
    const { result, responsesSheet } = req.body;
    
    // Save test result
    db.prepare(`
      INSERT OR REPLACE INTO results (candidateId, correct, wrong, skipped, total, score, qualified, submittedAt, timeTaken, violations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      result.candidateId,
      result.correct,
      result.wrong,
      result.skipped,
      result.total,
      result.score,
      result.qualified ? 1 : 0,
      result.submittedAt,
      result.timeTaken,
      result.violations
    );

    // Save detailed response sheet
    db.prepare(`
      INSERT OR REPLACE INTO responses (candidateId, answers, submittedAt)
      VALUES (?, ?, ?)
    `).run(
      responsesSheet.candidateId,
      JSON.stringify(responsesSheet.answers),
      responsesSheet.submittedAt
    );

    // Update candidate status
    db.prepare('UPDATE candidates SET testStatus = ? WHERE id = ?')
      .run(result.qualified ? 'qualified' : 'rejected', result.candidateId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit test results' });
  }
});

// 9. Book Interview Slot (Candidate Side)
app.post('/api/interviews/book', (req, res) => {
  try {
    const { id, candidateId, candidateName, date, slot, mode, bookedAt, status } = req.body;
    
    db.prepare(`
      INSERT OR REPLACE INTO interviews (id, candidateId, candidateName, date, slot, mode, bookedAt, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, candidateId, candidateName, date, slot, mode, bookedAt, status);

    // Update candidate status
    db.prepare('UPDATE candidates SET interviewStatus = ? WHERE id = ?').run(status, candidateId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to book interview slot' });
  }
});

// ============================================================================
// ADMIN API ROUTES
// ============================================================================

// 10. Admin Authentication
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ? AND password = ?').get(username.toLowerCase(), password);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    res.json({ username: admin.username, role: admin.role, loginAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Admin authentication failed' });
  }
});

// 11. Admin Analytics
app.get('/api/admin/analytics', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;
    const tested = db.prepare('SELECT COUNT(*) as count FROM results').get().count;
    const qualified = db.prepare('SELECT COUNT(*) as count FROM results WHERE qualified = 1').get().count;
    const rejected = db.prepare('SELECT COUNT(*) as count FROM results WHERE qualified = 0').get().count;
    const interviews = db.prepare('SELECT COUNT(*) as count FROM interviews').get().count;
    
    const avgScoreRow = db.prepare('SELECT AVG(score) as avg FROM results').get();
    const avgScore = avgScoreRow.avg ? Math.round(avgScoreRow.avg) : 0;
    const passRate = tested > 0 ? Math.round((qualified / tested) * 100) : 0;

    res.json({
      total,
      tested,
      qualified,
      rejected,
      interviews,
      avgScore,
      passRate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analytics loading failed' });
  }
});

// 12. Admin Interview Management (Create/Reschedule)
app.post('/api/admin/interviews/schedule', (req, res) => {
  try {
    const { id, candidateId, candidateName, date, slot, mode, bookedAt, status } = req.body;
    
    db.prepare(`
      INSERT OR REPLACE INTO interviews (id, candidateId, candidateName, date, slot, mode, bookedAt, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, candidateId, candidateName, date, slot, mode, bookedAt, status);

    // Update candidate status
    db.prepare('UPDATE candidates SET interviewStatus = ? WHERE id = ?').run(status, candidateId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// 13. Admin Interview Cancellation
app.delete('/api/admin/interviews/:id', (req, res) => {
  try {
    const { id } = req.params;
    const interview = db.prepare('SELECT candidateId FROM interviews WHERE id = ?').get(id);
    if (interview) {
      db.prepare('UPDATE candidates SET interviewStatus = "cancelled" WHERE id = ?').run(interview.candidateId);
      db.prepare('DELETE FROM interviews WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel interview' });
  }
});

// 14. Admin Questions Bank Management (Add/Update)
app.post('/api/admin/questions', (req, res) => {
  try {
    const { id, category, subcategory, question, options, answer, explanation } = req.body;
    
    if (id) {
      // Update
      db.prepare(`
        UPDATE questions 
        SET category = ?, subcategory = ?, question = ?, options = ?, answer = ?, explanation = ?
        WHERE id = ?
      `).run(category, subcategory, question, JSON.stringify(options), answer, explanation || '', id);
    } else {
      // Insert
      db.prepare(`
        INSERT INTO questions (category, subcategory, question, options, answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(category, subcategory, question, JSON.stringify(options), answer, explanation || '');
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Question saving failed' });
  }
});

// 15. Admin Delete Question
app.delete('/api/admin/questions/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM questions WHERE id = ?').run(parseInt(id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// 16. Admin Delete Candidate
app.delete('/api/admin/candidates/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete uploads associated
    const candidate = db.prepare('SELECT resumeName FROM candidates WHERE id = ?').get(id);
    if (candidate && candidate.resumeName) {
      const resumePath = path.join(uploadsDir, candidate.resumeName);
      if (fs.existsSync(resumePath)) {
        try { fs.unlinkSync(resumePath); } catch (e) { console.error('Failed deleting resume file:', e); }
      }
    }

    db.prepare('DELETE FROM candidates WHERE id = ?').run(id);
    // SQLite cascade should trigger cascade deletes if set up correctly,
    // but we can manually clean up results/interviews/responses in case FK cascade isn't fully enabled
    db.prepare('DELETE FROM results WHERE candidateId = ?').run(id);
    db.prepare('DELETE FROM interviews WHERE candidateId = ?').run(id);
    db.prepare('DELETE FROM responses WHERE candidateId = ?').run(id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// 17. Admin Reset Data (Clear All)
app.post('/api/admin/clear-all', (req, res) => {
  try {
    // Delete all upload files
    fs.readdir(uploadsDir, (err, files) => {
      if (err) return console.error(err);
      for (const file of files) {
        fs.unlink(path.join(uploadsDir, file), err => {
          if (err) console.error(err);
        });
      }
    });

    db.exec(`
      DELETE FROM results;
      DELETE FROM interviews;
      DELETE FROM responses;
      DELETE FROM candidates;
      DELETE FROM emails;
    `);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Resetting database failed' });
  }
});

// Catch-all route to serve the HTML pages (Fallback for browser routing)
app.get('*', (req, res, next) => {
  // If the path contains api or uploads, skip this fallback
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`JK Recruitment Portal Backend successfully loaded.`);
  console.log(`Web application is live at http://localhost:${PORT}`);
  console.log(`To connect devices on the same Wi-Fi, use your local IP.`);
  console.log(`=============================================================`);
});
