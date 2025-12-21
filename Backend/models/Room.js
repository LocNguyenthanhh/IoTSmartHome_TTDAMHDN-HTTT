// Author: NTLoc
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  Room_name : String,
  HomeID: {    
    type: mongoose.Schema.Types.ObjectId,   // key uses ObjectId
    ref: "Home"
  }
});

module.exports = mongoose.model('Room', roomSchema);