const axios = require('axios');
const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;

class CryptoAPI {
  static async getLTCBalance(address) {
    const response = await axios.get(
      `https://api.blockcypher.com/v1/ltc/main/addrs/${address}?token=${BLOCKCYPHER_TOKEN}`
    );
    return response.data;
  }

  static async getLTCPrice() {
    try {
      const response = await axios.get(
        'https://api.blockcypher.com/v1/ltc/main?token=' + BLOCKCYPHER_TOKEN
      );
      return response.data;
    } catch (error) {
      const cgResponse = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd&include_24hr_change=true'
      );
      return {
        price_usd: cgResponse.data.litecoin.usd,
        change_24h: cgResponse.data.litecoin.usd_24h_change
      };
    }
  }

  static async getRobloxInfo(username) {
    const userResponse = await axios.post(
      'https://users.roblox.com/v1/usernames/users',
      { usernames: [username] }
    );
    
    if (!userResponse.data.data.length) throw new Error('User not found');
    
    const userId = userResponse.data.data[0].id;
    const displayName = userResponse.data.data[0].displayName;
    
    const [details, followers, friends] = await Promise.all([
      axios.get(`https://users.roblox.com/v1/users/${userId}`),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`)
    ]);

    return {
      id: userId,
      username: username,
      displayName: displayName,
      description: details.data.description,
      created: details.data.created,
      followers: followers.data.count,
      friends: friends.data.count,
      avatarUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`
    };
  }
}

module.exports = CryptoAPI;
