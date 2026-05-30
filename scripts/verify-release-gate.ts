/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

/**
 * Checks if a value or its children contain any stubbed, mocked, or smoke-test E2E execution flags.
 *
 * @param val The value to check (object, array, string, boolean).
 * @param currentPath The object path traversed so far (for informative error messages).
 * @param forbiddenSubstrings Substrings in keys or values that represent stubbed/mocked states.
 * @param forbiddenExactValues Specific strings/flags that are strictly disallowed.
 * @param violations Accumulator for all detected violations.
 */
export function scanForMockFlags(
  val: any,
  currentPath: string,
  forbiddenSubstrings: string[],
  forbiddenExactValues: string[],
  violations: string[]
): void {
  if (val === null || val === undefined) {
    return;
  }

  if (typeof val === 'string') {
    const lowerVal = val.toLowerCase();

    // Check exact values
    if (forbiddenExactValues.some((v) => val === v || lowerVal === v.toLowerCase())) {
      violations.push(`Forbidden mock/stub value "${val}" found at path: ${currentPath}`);
    } else {
      // Check for substring matches
      for (const sub of forbiddenSubstrings) {
        if (lowerVal.includes(sub)) {
          violations.push(
            `Potential mock/stub string "${val}" (matched "${sub}") found at path: ${currentPath}`
          );
        }
      }
    }
  } else if (typeof val === 'boolean') {
    // Flag if a boolean flag containing a mock/stub keyword is set to true
    if (val === true) {
      const lastPart = currentPath.split('.').pop() || '';
      const lowerKey = lastPart.toLowerCase();
      for (const sub of forbiddenSubstrings) {
        if (lowerKey.includes(sub)) {
          violations.push(
            `Forbidden boolean flag "${lastPart}" is set to true at path: ${currentPath}`
          );
        }
      }
    }
  } else if (Array.isArray(val)) {
    val.forEach((item, index) => {
      scanForMockFlags(
        item,
        `${currentPath}[${index}]`,
        forbiddenSubstrings,
        forbiddenExactValues,
        violations
      );
    });
  } else if (typeof val === 'object') {
    for (const key of Object.keys(val)) {
      const lowerKey = key.toLowerCase();

      // Check if key itself is forbidden
      if (forbiddenExactValues.some((v) => key === v || lowerKey === v.toLowerCase())) {
        violations.push(
          `Forbidden mock/stub key "${key}" found at path: ${currentPath ? `${currentPath}.${key}` : key}`
        );
      } else {
        for (const sub of forbiddenSubstrings) {
          if (lowerKey.includes(sub)) {
            // Flag if the mock key is enabled/non-falsy
            const value = val[key];
            if (value !== false && value !== null && value !== undefined && value !== '') {
              violations.push(
                `Potential mock/stub key "${key}" has non-empty/non-false value at path: ${currentPath ? `${currentPath}.${key}` : key}`
              );
            }
          }
        }
      }
      scanForMockFlags(
        val[key],
        currentPath ? `${currentPath}.${key}` : key,
        forbiddenSubstrings,
        forbiddenExactValues,
        violations
      );
    }
  }
}

/**
 * Release gate checker function that reads from target proof manifest file
 * and raises an Error if stubbed, mocked, or smoke-test E2E flags are found.
 *
 * @param manifestPath Custom path to the proof manifest json file.
 */
export function verifyReleaseGate(manifestPath?: string): void {
  const targetPath =
    manifestPath || path.resolve(process.cwd(), 'artifacts', 'proof_manifest.json');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Release gatecheck failed: Proof manifest file not found at ${targetPath}`);
  }

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(targetPath, 'utf8');
  } catch (error: any) {
    throw new Error(
      `Release gatecheck failed: Unable to read file at ${targetPath}. Error: ${error.message}`
    );
  }

  let manifest: any;
  try {
    manifest = JSON.parse(fileContent);
  } catch (error: any) {
    throw new Error(
      `Release gatecheck failed: Failed to parse proof manifest JSON. Error: ${error.message}`
    );
  }

  const forbiddenSubstrings = [
    'mock',
    'stub',
    'smoke',
    'draft',
    'fake',
    'bypass',
    'testrun',
    'dryrun',
    'dummy',
  ];

  const forbiddenExactValues = ['VerifierPipelineSmoke'];

  const violations: string[] = [];
  scanForMockFlags(manifest, '', forbiddenSubstrings, forbiddenExactValues, violations);

  if (violations.length > 0) {
    throw new Error(
      `Release Gate Verification Failed! The proof manifest contains active stubbed, mocked, or smoke-test E2E execution flags:\n` +
        violations.map((v) => `- ${v}`).join('\n') +
        `\nReleases are locked until E2E proofs are fully closed (all mocks/stubs/smoke pipeline flags removed).`
    );
  }

  console.log(
    'Release gate verification passed! All E2E proofs are fully closed (no stubbed/mocked flags detected).'
  );
}

// Execute the check if run directly
if (typeof require !== 'undefined' && (require as any).main === module) {
  try {
    verifyReleaseGate();
    process.exit(0);
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}
