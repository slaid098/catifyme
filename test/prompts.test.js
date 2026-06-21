import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisionPrompt, buildFallbackImgPrompt } from '../prompts.js';

describe('buildVisionPrompt', () => {
  test('returns array with system and user roles', () => {
    const messages = buildVisionPrompt('en', '~/temp/x.jpg');
    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'system');
    assert.equal(messages[1].role, 'user');
  });

  test('user content includes file part with puter_path', () => {
    const path = '~/catifyme_temp_123.jpg';
    const messages = buildVisionPrompt('en', path);
    const userContent = messages[1].content;
    assert.ok(Array.isArray(userContent), 'user content should be an array');
    const filePart = userContent.find((c) => c.type === 'file');
    assert.ok(filePart, 'should have a file part');
    assert.equal(filePart.puter_path, path);
  });

  test('user content includes text part with instruction', () => {
    const messages = buildVisionPrompt('en', '~/temp.jpg');
    const textPart = messages[1].content.find((c) => c.type === 'text');
    assert.ok(textPart, 'should have a text part');
    assert.ok(textPart.text.length > 0);
    assert.match(textPart.text, /image/i);
  });

  test('system prompt requires JSON output', () => {
    const messages = buildVisionPrompt('en', '~/temp.jpg');
    const sys = messages[0].content;
    assert.match(sys, /JSON/i);
    assert.match(sys, /return/i);
  });

  test('system prompt includes expected JSON shape keys', () => {
    const messages = buildVisionPrompt('en', '~/temp.jpg');
    const sys = messages[0].content;
    assert.match(sys, /cat_breed/);
    assert.match(sys, /cat_name/);
    assert.match(sys, /personality/);
    assert.match(sys, /fun_fact/);
    assert.match(sys, /img_prompt/);
  });

  test('references Russian for ru lang', () => {
    const messages = buildVisionPrompt('ru', '~/temp.jpg');
    assert.match(messages[0].content, /Russian/);
  });

  test('references English for en lang', () => {
    const messages = buildVisionPrompt('en', '~/temp.jpg');
    assert.match(messages[0].content, /English/);
  });

  test('never refuse instruction present', () => {
    const messages = buildVisionPrompt('en', '~/temp.jpg');
    assert.match(messages[0].content, /never refuse/i);
  });
});

describe('buildFallbackImgPrompt', () => {
  test('includes breed name when provided', () => {
    const prompt = buildFallbackImgPrompt('Siamese');
    assert.match(prompt, /Siamese/);
  });

  test('falls back to generic cat when no breed', () => {
    const prompt = buildFallbackImgPrompt(undefined);
    assert.match(prompt, /cat/);
  });

  test('falls back to generic cat when empty string', () => {
    const prompt = buildFallbackImgPrompt('');
    assert.match(prompt, /cat/);
  });

  test('includes edgy style keywords from STYLES list', () => {
    const prompt = buildFallbackImgPrompt('Tabby');
    const edgyKeywords = /acid|cyberpunk|glitch|vaporwave|dark fantasy|pop-art|graffiti|dreamcore/i;
    assert.match(prompt, edgyKeywords);
  });
});
