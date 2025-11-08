// Backend/controllers/feedController.js
const { getFeedData, sendFeedData } = require('../services/adafruitServices.js');
const Dialog = require('../models/Dialog.js');

exports.fetchFeedAndSave = async (req, res) => {
  try {
    const { feedKey } = req.params;
    const data = await getFeedData(feedKey);
    
    if (!data || !data.length) {
      return res.status(404).json({ error: 'No data found for this feed' });
    }

    const latest = data[0];
    await Dialog.create({
      Time: new Date(latest.created_at),
      Status_history: latest.value,
      Action: 'Sensor update',
    });

    res.json({ success: true, latest });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch and save feed: ${err.message}` });
  }
};

exports.sendCommand = async (req, res) => {
  try {
    const { feedKey, value } = req.body;
    
    if (!feedKey || value === undefined) {
      return res.status(400).json({ error: 'feedKey and value are required' });
    }

    const response = await sendFeedData(feedKey, value);
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ error: `Failed to send command: ${err.message}` });
  }
};