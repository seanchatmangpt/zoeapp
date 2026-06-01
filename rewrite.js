const fs = require('fs');
const path = require('path');

const dir = '/Users/sac/wasm4pm-compat/src';

function walk(d) {
    let results = [];
    const list = fs.readdirSync(d);
    list.forEach(file => {
        file = path.join(d, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.rs')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(dir);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // LossPolicy enum in loss.rs
    if (file.endsWith('loss.rs')) {
        content = content.replace(/pub enum LossPolicy \{[\s\S]*?\n\}/, `#[derive(Debug, Clone, PartialEq, Eq, Hash)]\npub enum LossTolerance {\n    OmitFields,\n    TruncatePrecision,\n}\n\n#[derive(Debug, Clone, PartialEq, Eq, Hash)]\npub enum LossPolicy {\n    Strict,\n    Lenient(LossTolerance),\n}`);
        
        content = content.replace(/pub struct LossReport<From, To, Items> \{[\s\S]*?\n\}/, `#[derive(Debug, Clone, PartialEq, Eq)]\npub struct LossReport {\n    pub location: String,\n    pub description: String,\n    pub bytes_affected: usize,\n}`);

        content = content.replace(/pub trait Project \{[\s\S]*?\}\n/, `pub trait Project {\n    type Source;\n    type Target;\n    fn project(source: &Self::Source, policy: &LossPolicy) -> Result<Self::Target, crate::xes::XesRefusal>;\n}\n`);

        // Remove old generic impls for LossReport
        content = content.replace(/impl<From, To, Items: Clone> Clone for LossReport<From, To, Items> \{[\s\S]*?\n\}\n/, '');
        content = content.replace(/impl<From, To, Items: core::fmt::Debug> core::fmt::Debug for LossReport<From, To, Items> \{[\s\S]*?\n\}\n/, '');
        content = content.replace(/impl<From, To, Items> LossReport<From, To, Items> \{[\s\S]*?\}\n\nimpl<From, To, Items: IsEmpty> LossReport<From, To, Items> \{[\s\S]*?\}\n/, '');

        // Remove old LossPolicy methods
        content = content.replace(/impl Default for LossPolicy \{[\s\S]*?\}\n\nimpl LossPolicy \{[\s\S]*?\}\n\nimpl core::fmt::Display for LossPolicy \{[\s\S]*?\}\n/, '');
    }

    if (file.endsWith('xes.rs')) {
        content = content.replace(/LiftingLoss,/, `LiftingLoss {\n        reason: String,\n        bytes_lost: usize,\n    },\n    LoweringLoss {\n        reason: String,\n        bytes_lost: usize,\n    },`);
        
        content = content.replace(/XesRefusal::LiftingLoss => "LiftingLoss",/, `XesRefusal::LiftingLoss { .. } => "LiftingLoss",\n            XesRefusal::LoweringLoss { .. } => "LoweringLoss",`);
    }

    // Replace LossPolicy usages
    content = content.replace(/LossPolicy::RefuseLoss/g, 'LossPolicy::Strict');
    content = content.replace(/LossPolicy::ForbidLoss/g, 'LossPolicy::Strict'); // just in case
    content = content.replace(/LossPolicy::AllowNamedProjection/g, 'LossPolicy::Lenient(crate::loss::LossTolerance::OmitFields)');
    content = content.replace(/LossPolicy::AllowLossWithReport/g, 'LossPolicy::Lenient(crate::loss::LossTolerance::OmitFields)');

    // Replace generic LossReport
    content = content.replace(/LossReport<[a-zA-Z0-9_:<>,\s\(\)]*>/g, 'LossReport');
    
    // Replace LossReport::<...>::new(...) with LossReport { ... }
    content = content.replace(/LossReport(?:::<[^>]+>)?::new\([^;]*?\)/g, 'LossReport { location: String::new(), description: String::new(), bytes_affected: 0 }');
    content = content.replace(/crate::loss::LossReport::new\([^;]*?\)/g, 'crate::loss::LossReport { location: String::new(), description: String::new(), bytes_affected: 0 }');

    // Remove is_lossless calls or replace
    content = content.replace(/\.is_lossless\(\)/g, '.bytes_affected == 0');
    // report.lost
    content = content.replace(/\.lost/g, '.description');

    // Replace Project impls in interop.rs
    if (file.endsWith('interop.rs') || file.endsWith('interop.rs.bak')) {
        content = content.replace(/impl crate::loss::Project for OcelToXesProjection \{[\s\S]*?\n\}/, `impl crate::loss::Project for OcelToXesProjection {
    type Source = crate::interop::OcelShape;
    type Target = crate::loss::LossReport;

    fn project(source: &Self::Source, policy: &crate::loss::LossPolicy) -> Result<Self::Target, crate::xes::XesRefusal> {
        match policy {
            crate::loss::LossPolicy::Strict => Err(crate::xes::XesRefusal::LoweringLoss { reason: "Strict".into(), bytes_lost: 0 }),
            crate::loss::LossPolicy::Lenient(_) => Ok(crate::loss::LossReport { location: "OcelToXes".into(), description: "".into(), bytes_affected: 0 })
        }
    }
}`);

        content = content.replace(/impl crate::loss::Project for XesToOcedProjection \{[\s\S]*?\n\}/, `impl crate::loss::Project for XesToOcedProjection {
    type Source = crate::interop::XesShape;
    type Target = crate::loss::LossReport;

    fn project(source: &Self::Source, policy: &crate::loss::LossPolicy) -> Result<Self::Target, crate::xes::XesRefusal> {
        match policy {
            crate::loss::LossPolicy::Strict => Err(crate::xes::XesRefusal::LiftingLoss { reason: "Strict".into(), bytes_lost: 0 }),
            crate::loss::LossPolicy::Lenient(_) => Ok(crate::loss::LossReport { location: "XesToOced".into(), description: "".into(), bytes_affected: 0 })
        }
    }
}`);
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}
