import { defineCommand } from "citty";

export const telcoCommand = defineCommand({
  meta: {
    name: "telco",
    description: "telco command",
  },

  async run(ctx) {
    console.log("Subcommand telco is wired.");
  },
});

export default telcoCommand;
