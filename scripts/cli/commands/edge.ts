import { defineCommand } from "citty";

export const edgeCommand = defineCommand({
  meta: {
    name: "edge",
    description: "edge command",
  },

  async run(ctx) {
    console.log("Subcommand edge is wired.");
  },
});

export default edgeCommand;
