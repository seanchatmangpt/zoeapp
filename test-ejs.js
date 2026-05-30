const { render } = require('ejs');
const template = `<% if (withSubcommands) { %>subCommands: {}<% } else { %>async run(ctx) {}<% } %>`;
console.log(render(template, { withSubcommands: true }));
console.log(render(template, { withSubcommands: false }));
console.log(render(template, { withSubcommands: "true" }));
console.log(render(template, { withSubcommands: "false" }));
