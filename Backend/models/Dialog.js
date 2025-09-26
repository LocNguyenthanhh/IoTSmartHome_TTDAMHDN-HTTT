// Author: NTLoc
const mongoose =require("mongoose");

const dialogSchema = new mongoose.Schema({
  Time: Date,
  Status_history: String,
  Action: String, 
  DeviceID: {    
    type: mongoose.Schema.Types.ObjectId,   // key uses ObjectId
    ref: "Device",
    required: true
  }

});

module.exports = mongoose.model('Dialog', dialogSchema);