const fs = require('fs');
const file = '/Users/sac/wasm4pm-compat/src/loss.rs';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
`#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LossTolerance {
    OmitFields,
    TruncatePrecision,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LossPolicy {
    Strict,
    Lenient(LossTolerance),
}

    }
}`,
`#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LossTolerance {
    OmitFields,
    TruncatePrecision,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LossPolicy {
    Strict,
    Lenient(LossTolerance),
}`
);

fs.writeFileSync(file, text);
console.log("Fixed loss.rs");