import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDomMocks, resetDomMocks } from './helpers/dom-mock.js';

installDomMocks();

let share;

beforeEach(async () => {
  resetDomMocks();
  share = await import('../share.js');
});

describe('siteUrl', () => {
  test('returns the canonical site URL', () => {
    const url = share.siteUrl();
    assert.ok(url.startsWith('https://'));
    assert.match(url, /catifyme/);
  });
});

describe('composeShareableImage', () => {
  test('returns a blob from image src', async () => {
    const blob = await share.composeShareableImage('data:image/png;base64,mock');
    assert.ok(blob, 'should return a blob');
    assert.equal(typeof blob.size, 'number');
  });
});

describe('downloadBlob', () => {
  test('creates an anchor element and triggers download', () => {
    const blob = { size: 100, type: 'image/jpeg' };
    let createdTag = null;
    const origCreate = globalThis.document.createElement;
    globalThis.document.createElement = (tag) => {
      const el = origCreate(tag);
      if (tag === 'a') createdTag = el;
      return el;
    };
    globalThis.document.body = { appendChild: () => {}, removeChild: () => {} };
    share.downloadBlob(blob, 'test-cat.jpg');
    assert.ok(createdTag, 'should create an <a> element');
    assert.equal(createdTag.download, 'test-cat.jpg');
    globalThis.document.createElement = origCreate;
  });
});

describe('shareImage', () => {
  test('uses Web Share API with files when canShare is true', async () => {
    let sharedData = null;
    globalThis.navigator.canShare = (data) => true;
    globalThis.navigator.share = async (data) => { sharedData = data; };
    const blob = { size: 100, type: 'image/jpeg' };
    const result = await share.shareImage(blob, 'Check out my cat');
    assert.equal(result, 'shared');
    assert.ok(sharedData.files, 'should share files');
    assert.equal(sharedData.text, 'Check out my cat');
  });

  test('falls back to navigator.share without files when canShare is false', async () => {
    let sharedData = null;
    globalThis.navigator.canShare = (data) => false;
    globalThis.navigator.share = async (data) => { sharedData = data; };
    const blob = { size: 100, type: 'image/jpeg' };
    const result = await share.shareImage(blob, 'Check out my cat');
    assert.equal(result, 'shared');
    assert.ok(!sharedData.files, 'should not include files');
    assert.match(sharedData.text, /catifyme/);
  });

  test('falls back to copyLink when navigator.share is unavailable', async () => {
    globalThis.navigator.canShare = undefined;
    globalThis.navigator.share = undefined;
    let copiedText = null;
    globalThis.navigator.clipboard = { writeText: async (t) => { copiedText = t; } };
    const blob = { size: 100, type: 'image/jpeg' };
    const result = await share.shareImage(blob, 'Check out my cat');
    assert.equal(result, 'copied');
    assert.ok(copiedText.includes('catifyme'));
  });
});

describe('copyLink', () => {
  test('uses clipboard.writeText when available', async () => {
    let copied = null;
    globalThis.navigator.clipboard = { writeText: async (t) => { copied = t; } };
    await share.copyLink('test link text');
    assert.equal(copied, 'test link text');
  });

  test('falls back to execCommand when clipboard unavailable', async () => {
    globalThis.navigator.clipboard = undefined;
    let executedCommand = null;
    globalThis.document.execCommand = (cmd) => { executedCommand = cmd; };
    await share.copyLink('fallback text');
    assert.equal(executedCommand, 'copy');
  });
});
