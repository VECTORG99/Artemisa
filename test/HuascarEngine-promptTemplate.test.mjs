import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

describe('HuascarEngine PromptTemplate integration', () => {
  let HuascarEngine;
  let PromptTemplate;
  let config;

  before(async () => {
    process.env.LLM_MOCK_MODE = 'true';
    delete process.env.OPENAI_API_KEY;
    const engineMod = await import('../src/engine/HuascarEngine.js');
    const templateMod = await import('../src/engine/PromptTemplate.js');
    const configMod = await import('../src/config.js');
    HuascarEngine = engineMod.HuascarEngine;
    PromptTemplate = templateMod.PromptTemplate;
    config = configMod.config;
  });

  it('interpolates {{role_name}} and built-in variables in the system prompt sent to the LLM', async () => {
    const previousMock = config.llm.mockMode;
    const previousHasLlmProvider = config.hasLlmProvider;
    config.llm.mockMode = false;
    config.hasLlmProvider = true;

    const template = new PromptTemplate();
    const engine = new HuascarEngine('CUSTOM_ROLE', {
      readFile: () => JSON.stringify({
        roles: {
          CUSTOM_ROLE: {
            name: 'Integration Reviewer',
            system_prompt: 'You are {{role_name}}. Today is {{date}}.',
            temperature: 0.2,
          },
        },
      }),
      exists: () => false,
      rag: { getContext: async () => '', loadSources: async () => {} },
      mcpPool: { getConnections: async () => [] },
      promptTemplate: template,
      generateTextWithFallback: async ({ system }) => ({ text: system }),
    });

    const result = await engine.executeTask('review this');
    assert.equal(result.status, 'success');
    assert.match(result.response, /^You are Integration Reviewer\. Today is \d{4}-\d{2}-\d{2}\.$/);

    config.llm.mockMode = previousMock;
    config.hasLlmProvider = previousHasLlmProvider;
  });

  it('renders partials registered on the injected PromptTemplate', async () => {
    const previousMock = config.llm.mockMode;
    const previousHasLlmProvider = config.hasLlmProvider;
    config.llm.mockMode = false;
    config.hasLlmProvider = true;

    const template = new PromptTemplate();
    template.registerPartial('safety', 'SAFETY: never leak secrets.');

    const engine = new HuascarEngine('CUSTOM_ROLE', {
      readFile: () => JSON.stringify({
        roles: {
          CUSTOM_ROLE: {
            name: 'Partial Reviewer',
            system_prompt: 'Base instructions.\n{{> safety}}',
            temperature: 0.2,
          },
        },
      }),
      exists: () => false,
      rag: { getContext: async () => '', loadSources: async () => {} },
      mcpPool: { getConnections: async () => [] },
      promptTemplate: template,
      generateTextWithFallback: async ({ system }) => ({ text: system }),
    });

    const result = await engine.executeTask('review this');
    assert.equal(result.status, 'success');
    assert.equal(result.response, 'Base instructions.\nSAFETY: never leak secrets.');
  });

  it('injects RAG context via {{rag_context}} without duplicating it', async () => {
    const previousMock = config.llm.mockMode;
    const previousHasLlmProvider = config.hasLlmProvider;
    config.llm.mockMode = false;
    config.hasLlmProvider = true;

    const template = new PromptTemplate();
    const engine = new HuascarEngine('CUSTOM_ROLE', {
      readFile: () => JSON.stringify({
        roles: {
          CUSTOM_ROLE: {
            name: 'RAG Reviewer',
            system_prompt: 'Base.\n{{#if has_rag}}\nCONTEXT:\n{{rag_context}}\n{{/if}}',
            temperature: 0.2,
          },
        },
      }),
      exists: () => false,
      rag: { getContext: async () => 'retrieved knowledge chunk', loadSources: async () => {} },
      mcpPool: { getConnections: async () => [] },
      promptTemplate: template,
      generateTextWithFallback: async ({ system }) => ({ text: system }),
    });

    const result = await engine.executeTask('review this');
    assert.equal(result.status, 'success');

    const occurrences = result.response.split('retrieved knowledge chunk').length - 1;
    assert.equal(occurrences, 1, 'RAG context should appear exactly once, not duplicated');
    assert.match(result.response, /CONTEXT:\nretrieved knowledge chunk/);

    config.llm.mockMode = previousMock;
    config.hasLlmProvider = previousHasLlmProvider;
  });

  it('falls back to appending RAG context for prompts not using template syntax (backward compatibility)', async () => {
    const previousMock = config.llm.mockMode;
    const previousHasLlmProvider = config.hasLlmProvider;
    config.llm.mockMode = false;
    config.hasLlmProvider = true;

    const template = new PromptTemplate();
    const engine = new HuascarEngine('CUSTOM_ROLE', {
      readFile: () => JSON.stringify({
        roles: {
          CUSTOM_ROLE: {
            name: 'Legacy Reviewer',
            system_prompt: 'Plain legacy prompt with no placeholders.',
            temperature: 0.2,
          },
        },
      }),
      exists: () => false,
      rag: { getContext: async () => 'legacy rag chunk', loadSources: async () => {} },
      mcpPool: { getConnections: async () => [] },
      promptTemplate: template,
      generateTextWithFallback: async ({ system }) => ({ text: system }),
    });

    const result = await engine.executeTask('review this');
    assert.equal(result.status, 'success');
    assert.equal(result.response, 'Plain legacy prompt with no placeholders.\n\nlegacy rag chunk');

    config.llm.mockMode = previousMock;
    config.hasLlmProvider = previousHasLlmProvider;
  });

  it('omits {{#if has_rag}} block entirely when there is no RAG context', async () => {
    const previousMock = config.llm.mockMode;
    const previousHasLlmProvider = config.hasLlmProvider;
    config.llm.mockMode = false;
    config.hasLlmProvider = true;

    const template = new PromptTemplate();
    const engine = new HuascarEngine('CUSTOM_ROLE', {
      readFile: () => JSON.stringify({
        roles: {
          CUSTOM_ROLE: {
            name: 'No RAG Reviewer',
            system_prompt: 'Base.\n{{#if has_rag}}\nCONTEXT:\n{{rag_context}}\n{{/if}}\nEnd.',
            temperature: 0.2,
          },
        },
      }),
      exists: () => false,
      rag: { getContext: async () => '', loadSources: async () => {} },
      mcpPool: { getConnections: async () => [] },
      promptTemplate: template,
      generateTextWithFallback: async ({ system }) => ({ text: system }),
    });

    const result = await engine.executeTask('review this');
    assert.equal(result.status, 'success');
    assert.equal(result.response, 'Base.\n\nEnd.');
  });
});
