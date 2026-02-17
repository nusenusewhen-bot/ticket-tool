const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Database {
  static async setAddress(userId, address) {
    await db.set(`address_${userId}`, address);
  }

  static async getAddress(userId) {
    return await db.get(`address_${userId}`);
  }
}

module.exports = Database;
