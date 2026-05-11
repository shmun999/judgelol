const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "db.json");

// 초기 DB 구조
const defaultData = { posts: [], comments: [], voteOptions: [], nextId: { posts: 1, comments: 1, voteOptions: 1 } };

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(db, table) {
  const id = db.nextId[table];
  db.nextId[table]++;
  return id;
}

module.exports = { readDB, writeDB, nextId };
