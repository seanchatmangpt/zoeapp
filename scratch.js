const frontmatter = require('front-matter');
console.log(frontmatter(`---
target: foo
inject: true
---
`));
