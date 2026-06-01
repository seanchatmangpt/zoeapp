import { defineCommand } from "citty";

export const replayCommand = defineCommand({
  meta: {
    name: "replay",
    description: "replay command",
  },

  async run(ctx) {
    console.log("Subcommand replay is wired.");
  },
});

export default replayCommand;
