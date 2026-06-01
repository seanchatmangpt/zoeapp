import { defineCommand } from "citty";

export const smokeLieDetectorCommand = defineCommand({
  meta: {
    name: "lie-detector",
    description: "Lie detector subcommand",
  },

  async run(ctx) {
    console.log("Subcommand lie-detector is wired.");
  },
});

export default smokeLieDetectorCommand;
