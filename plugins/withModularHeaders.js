const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const modularPods = [
        "pod 'GoogleUtilities', :modular_headers => true",
        "pod 'RecaptchaInterop', :modular_headers => true",
        "pod 'AppCheckCore', :modular_headers => true",
      ].join("\n  ");

      podfile = podfile.replace(
        /use_expo_modules!/,
        `use_expo_modules!\n\n  ${modularPods}`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
