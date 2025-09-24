// Author: NTLoc
// Example from chatGPT

const Device = require('../models/Device');

exports.getDevices = async (req, res) => {
  const devices = await Device.find();
  res.json(devices);
};

exports.updateDevice = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await Device.findByIdAndUpdate(id, { status }, { new: true });
  res.json(updated);
};
