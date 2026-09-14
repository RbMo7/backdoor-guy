const { exec } = require("child_process");
const path = require("path");

const file = path.join(__dirname, "..", "nice-try.html");

const cmd =
  process.platform === "darwin"
    ? `open "${file}"`
    : process.platform === "win32"
      ? `start "" "${file}"`
      : `xdg-open "${file}"`;

exec(cmd, () => {});
