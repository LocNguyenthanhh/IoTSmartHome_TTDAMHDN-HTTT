// Author: NTLoc
// Example from chatGPT

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: String,
  type: String,
  status: { type: String, default: 'off' },
});

module.exports = mongoose.model('Device', deviceSchema);
