// Author: NTLoc
const mongoose =require("mongoose");

const dialogSchema = new mongoose.Schema({
  Time: Date,
  Status_history: String,
  Action: String, 
  DeviceID: {    
    type: mongoose.Schema.Types.ObjectId,   // key uses ObjectId
    ref: "Device"
  }

});

dialogSchema.index({ DialogID: 1, DeviceID: 1 }, { unique: true });

module.exports = mongoose.model('Dialog', dialogSchema);