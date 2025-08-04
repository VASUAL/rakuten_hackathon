const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
async function setupDatabase() {
    const db = await open({
        filename: './mydatabase.sqlite',
        driver: sqlite3.Database
    });
    await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    adults INTEGER,
    children INTEGER,
    infants INTEGER,
    elderly INTEGER,
    has_pet BOOLEAN,
    address TEXT,
    rakuten_points INTEGER DEFAULT 0
   );
`);
    await db.exec(`CREATE TABLE IF NOT EXISTS product_lists 
    (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    composition_hash TEXT NOT NULL,
    product_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
    );
`);
    console.log('The database has been successfully started');
    return db;
}
module.exports = setupDatabase;