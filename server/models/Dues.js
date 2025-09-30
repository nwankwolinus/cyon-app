const mongoose = require("mongoose");

const duesSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  year: { type: Number, required: true },
  month: {
    type: String,
    enum: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ],
    required: true
  },
  status: {
    type: String,
    enum: ["paid", "unpaid"],
    default: "paid"
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Dues", duesSchema);