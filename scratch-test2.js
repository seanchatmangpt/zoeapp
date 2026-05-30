const { render } = require('ejs');
const template = `<% if (typeof withSubcommands !== "undefined" && String(withSubcommands) === "true") { %>subCommands: {}<% } else { %>async run(ctx) {}<% } %>`;
console.log(render(template, { withSubcommands: true }));
