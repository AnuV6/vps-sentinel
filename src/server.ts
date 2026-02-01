import express from 'express';
import path from 'path';
import { getDb } from './database';
import { startMonitoring, checkSite } from './monitor';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', async (req, res) => {
    const db = await getDb();

    // Get all monitors
    const monitors = await db.all('SELECT * FROM monitors');

    // For each monitor, get the last 20 checks for the sparkline
    for (let m of monitors) {
        const history = await db.all(
            `SELECT latency, status, timestamp FROM checks WHERE monitor_id = ? ORDER BY id DESC LIMIT 20`,
            [m.id]
        );
        m.history = history.reverse(); // Newest last for chart
    }

    res.render('dashboard', { monitors });
});

app.post('/add', async (req, res) => {
    const { name, url } = req.body;
    const db = await getDb();
    const result = await db.run('INSERT INTO monitors (name, url) VALUES (?, ?)', [name, url]);

    // Run immediate check
    const newMonitor = await db.get('SELECT * FROM monitors WHERE id = ?', [result.lastID]);
    checkSite(newMonitor);

    res.redirect('/');
});

app.post('/delete/:id', async (req, res) => {
    const db = await getDb();
    await db.run('DELETE FROM monitors WHERE id = ?', [req.params.id]);
    await db.run('DELETE FROM checks WHERE monitor_id = ?', [req.params.id]); // Cleanup logs
    res.redirect('/');
});

// Start Server
app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await getDb(); // Init DB
    startMonitoring(); // Start background worker
});
