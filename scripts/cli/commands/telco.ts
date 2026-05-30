import { defineCommand } from "citty";

export const telcoCommand = defineCommand({
  meta: {
    name: "telco",
    description: "telco command",
  },

  async run(ctx) {
    // TODO: implement telco.
    console.log("Subcommand telco is wired.");
  },
});

export default telcoCommand;
