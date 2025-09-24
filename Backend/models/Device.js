// Author: NTLoc

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  Type: String,
  Device_status: String,
  RoomID: {    
    type: mongoose.Schema.Types.ObjectId,   // key uses ObjectId
    ref: "Room"
  },
  UserID: {    
    type: mongoose.Schema.Types.ObjectId,   // key uses ObjectId
    ref: "User"
  }
});

module.exports = mongoose.model('Device', deviceSchema);
