import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Creator critical bug fixes (#338, #319, #320, #323)', () => {

  const generator = fs.readFileSync('src/creator/generator.ts', 'utf8');

  describe('#338: RAG source-code pattern per language', () => {
    it('inferSourcePattern function exists', () => {
      assert.match(generator, /function inferSourcePattern/);
    });

    it('maps Python to *.py', () => {
      assert.match(generator, /python.*\*\.py/);
    });

    it('maps Go to *.go', () => {
      assert.match(generator, /go.*\*\.go/);
    });

    it('maps Java to *.java', () => {
      assert.match(generator, /java.*\*\.java/);
    });

    it('mapRagSources accepts languages parameter', () => {
      assert.match(generator, /mapRagSources\(.*languages/);
    });

    it('call site passes blueprint.project.technologies', () => {
      assert.match(generator, /mapRagSources\(blueprint\.knowledge\.sources,\s*blueprint\.project\.technologies\)/);
    });
  });

  describe('#319: GitHub MCP for review-pr capability', () => {
    it('buildMcpConfig checks for review-pr capability', () => {
      assert.match(generator, /capabilities\.includes\('review-pr'\)/);
    });
  });

  describe('#320: INSTALL.md includes dev section for env=both', () => {
    it('buildInstall checks for development flag', () => {
      assert.match(generator, /const development = blueprint\.environments\.target === 'development' \|\| blueprint\.environments\.target === 'both'/);
    });

    it('generates both dev and prod sections conditionally', () => {
      assert.match(generator, /Uso en desarrollo/);
      assert.match(generator, /Paso a producción/);
    });

    it('uses numbered subsections (4a/4b) when both', () => {
      assert.match(generator, /4a.*4b|4b.*4a/s);
    });
  });

  describe('#323: local-fs/bash-terminal only for development-only env', () => {
    it('uses developmentOnly check instead of not-production', () => {
      assert.match(generator, /const developmentOnly = blueprint\.environments\.target === 'development'/);
    });

    it('local-fs gated by developmentOnly', () => {
      assert.match(generator, /developmentOnly && capabilities\.includes\('read-repository'\)/);
    });

    it('bash-terminal gated by developmentOnly', () => {
      assert.match(generator, /developmentOnly && capabilities\.includes\('run-tests'\)/);
    });

    it('does NOT use target !== production (which allows both)', () => {
      assert.doesNotMatch(generator, /target !== 'production' && capabilities\.includes\('read-repository'\)/);
      assert.doesNotMatch(generator, /target !== 'production' && capabilities\.includes\('run-tests'\)/);
    });
  });
});
