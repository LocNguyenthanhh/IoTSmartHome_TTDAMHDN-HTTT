// Author: HinHin
const mongoose = require('mongoose');

const homeSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        default: "My Home"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Home', homeSchema);