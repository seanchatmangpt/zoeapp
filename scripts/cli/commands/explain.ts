import { defineCommand } from "citty";

export const explainCommand = defineCommand({
  meta: {
    name: "explain",
    description: "explain command",
  },

  async run(ctx) {
    // TODO: implement explain.
    console.log("Subcommand explain is wired.");
  },
});

export default explainCommand;
