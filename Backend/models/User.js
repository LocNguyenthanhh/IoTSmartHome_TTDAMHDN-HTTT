// Author: HinHin
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  User_name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3
  },
  Phone_No: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  Password: {
    type: String,
    required: true,
    minlength: 6
  },
  HomeID: {    
    type: mongoose.Schema.Types.ObjectId,
    ref: "Home"
  }
}, {
  timestamps: true
});

// Tạo index để tìm kiếm nhanh
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ Phone_No: 1 });

module.exports = mongoose.model('User', userSchema);