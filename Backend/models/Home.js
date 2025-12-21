// Author: NTLoc
const mongoose = require("mongoose");

const homeSchema = new mongoose.Schema({
  Address: String
});

module.exports = mongoose.model('Home', homeSchema);