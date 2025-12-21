const axios = require("axios");
const Dialog = require("../models/Dialog");

function watchDialogChanges() {
  Dialog.watch().on("change", async (change) => {
    if (change.operationType === "insert") {
      const doc = change.fullDocument;

      console.log("Dialog insert nhận đúng deviceId:", doc);

      const deviceId = doc.DeviceID?.toString();
      const status = doc.Status_history;
      const time = doc.Time;
      const action = doc.Action;

      if (!deviceId) {
        console.log("⚠️ Không có deviceId trong dialog!");
        return;
      }

      try {
        await axios.post("http://127.0.0.1:5000/device_update", {
          id: deviceId,
          state: status === "ON",
          time,
          action
        });

        console.log("Pushed dialog to Flask OK");
      } catch (err) {
        console.log("Push dialog update to Flask failed:", err.message);
      }
    }
  });

  console.log("Watching Dialog changes...");
}

module.exports = { watchDialogChanges };
