import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SUITES_DIR = path.resolve('eval/suites');
const STEERING_PATH = path.resolve('src/kiro/steering.json');

describe('Eval suites use valid steering roles', () => {
  it('every case role exists in steering.json', () => {
    const steering = JSON.parse(fs.readFileSync(STEERING_PATH, 'utf-8'));
    const validRoles = new Set(Object.keys(steering.roles));

    const suiteFiles = fs.readdirSync(SUITES_DIR).filter((f) => f.endsWith('.json'));
    assert.ok(suiteFiles.length > 0, 'expected at least one eval suite');

    for (const file of suiteFiles) {
      const suite = JSON.parse(fs.readFileSync(path.join(SUITES_DIR, file), 'utf-8'));
      for (const evalCase of suite.cases) {
        assert.ok(
          validRoles.has(evalCase.role),
          `${file} case "${evalCase.id}" uses role "${evalCase.role}" which does not exist in steering.json (valid: ${[...validRoles].join(', ')})`,
        );
      }
    }
  });
});
