const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  User_name: String,
  Phone_No: String,
  email: { type: String, required: true, unique: true },
  Password: String,
  HomeID: { type: mongoose.Schema.Types.ObjectId, ref: "Home" },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});



module.exports = mongoose.model('User', userSchema);