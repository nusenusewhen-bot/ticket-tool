const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

// Create file if doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

class Database {
  static getData() {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      return {};
    }
  }

  static saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }

  static async setAddress(userId, address) {
    const data = this.getData();
    data[userId] = { address };
    this.saveData(data);
  }

  static async getAddress(userId) {
    const data = this.getData();
    return data[userId]?.address || null;
  }
}

module.exports = Database;
