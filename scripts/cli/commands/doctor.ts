import { defineCommand } from "citty";

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description: "doctor command",
  },

  async run(ctx) {
    console.log("Subcommand doctor is wired.");
  },
});

export default doctorCommand;
