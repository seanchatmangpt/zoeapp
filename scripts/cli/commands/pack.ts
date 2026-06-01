import { defineCommand } from "citty";

export const packCommand = defineCommand({
  meta: {
    name: "pack",
    description: "pack command",
  },

  async run(ctx) {
    console.log("Subcommand pack is wired.");
  },
});

export default packCommand;
