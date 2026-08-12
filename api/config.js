// Public listing of playable adventures for the create-game page.
const { listAdventures } = require('./_lib/content.js');
const { sendJSON } = require('./_lib/games.js');

module.exports = async (req, res) => {
  sendJSON(res, 200, { adventures: listAdventures() });
};
