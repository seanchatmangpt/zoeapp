import { defineCommand } from "citty";

export const smokeCommand = defineCommand({
  meta: {
    name: "smoke",
    description: "Smoke command",
  },

  subCommands: {
    // <citty-subcommands>

    "lie-detector": () => import("../smoke/lie-detector").then((m) => m.default),
  },

});

export default smokeCommand;
