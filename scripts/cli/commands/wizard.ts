import { defineCommand } from "citty";

export const wizardCommand = defineCommand({
  meta: {
    name: "wizard",
    description: "wizard command",
  },

  async run(ctx) {
    console.log("Subcommand wizard is wired.");
  },
});

export default wizardCommand;
