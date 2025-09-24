// Author: NTLoc
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  User_name: String,
  Phone_No: String,
  email: String,
  Password: String,
  HomeID: {    
    type: mongoose.Schema.Types.ObjectId,   // key uses ObjectId
    ref: "Home"
  }
});

module.exports = mongoose.model('User', userSchema);