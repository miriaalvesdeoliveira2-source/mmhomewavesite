const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/productCosts.json');

function getAllCosts() {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return {};
  }
}

function getCost(item_id) {
  const data = getAllCosts();
  return data[item_id] || null;
}

function saveCost(item_id, cost) {
  const data = getAllCosts();
  data[item_id] = cost;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  getCost,
  saveCost
};
