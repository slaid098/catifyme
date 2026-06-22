import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDomMocks } from './helpers/dom-mock.js';
import { createPuterMock, installPuter, uninstallPuter } from './helpers/puter-mock.js';

installDomMocks();

let mock;
let puterApi;

beforeEach(async () => {
  mock = createPuterMock();
  installPuter(mock.puter);
  puterApi = await import('../puter-api.js');
});

afterEach(() => {
  uninstallPuter();
});

describe('analyzeSelfie', () => {
  test('returns parsed cat data on happy path', async () => {
    const result = await puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en');
    assert.equal(result.catBreed, 'Tabby');
    assert.equal(result.catName, 'Whiskers');
    assert.ok(result.imgPrompt);
  });

  test('uploads image via puter.fs.write before chat', async () => {
    await puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en');
    assert.ok(mock.calls.fsWrite.length >= 1, 'should upload via fs.write');
    assert.ok(mock.calls.chat.length === 1, 'should call chat once');
  });

  test('passes puter_path in messages, not raw dataURL', async () => {
    await puterApi.analyzeSelfie('data:image/jpeg;base64,SECRETDATA', 'en');
    const chatCall = mock.calls.chat[0];
    const userContent = chatCall.messages[1].content;
    const filePart = userContent.find((c) => c.type === 'file');
    assert.ok(filePart?.puter_path, 'should have puter_path in file part');
    assert.ok(!filePart.puter_path.includes('data:image'), 'puter_path should not contain dataURL');
    assert.ok(!filePart.puter_path.includes('SECRETDATA'), 'raw image data must not leak into prompt');
    const textPart = userContent.find((c) => c.type === 'text');
    assert.ok(!textPart.text.includes('data:image'), 'text part should not contain dataURL');
  });

  test('cleans up temp file in finally even on error', async () => {
    mock.state.chatShouldThrow = new Error('model crashed');
    await assert.rejects(() => puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en'));
    assert.ok(mock.calls.fsDelete.length >= 1, 'temp file should be deleted even on error');
  });

  test('cleans up temp file on success', async () => {
    await puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en');
    assert.ok(mock.calls.fsDelete.length >= 1, 'temp file should be deleted on success');
  });

  test('throws on empty AI response', async () => {
    mock.state.chatResponse = { message: { content: '' } };
    await assert.rejects(
      () => puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en'),
      /Empty AI response/
    );
  });

  test('throws on incomplete JSON missing cat_breed', async () => {
    mock.state.chatResponse = { message: { content: '{"img_prompt":"x"}' } };
    await assert.rejects(
      () => puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en'),
      /Incomplete AI response/
    );
  });

  test('throws when no image provided', async () => {
    await assert.rejects(
      () => puterApi.analyzeSelfie(null, 'en'),
      /No image provided/
    );
  });
});

describe('generateCat', () => {
  test('returns image element on happy path', async () => {
    const img = await puterApi.generateCat('a cute tabby cat', 'Tabby');
    assert.ok(img.src);
  });

  test('passes model and quality options to txt2img', async () => {
    let capturedOpts;
    mock.puter.ai.txt2img = async (prompt, opts) => { capturedOpts = opts; return { src: 'data:mock' }; };
    await puterApi.generateCat('prompt', 'Tabby');
    assert.equal(capturedOpts.model, 'gpt-image-1-mini');
    assert.equal(capturedOpts.quality, 'low');
  });

  test('uses imgPrompt when provided', async () => {
    let capturedPrompt;
    mock.puter.ai.txt2img = async (prompt) => { capturedPrompt = prompt; return { src: 'data:mock' }; };
    await puterApi.generateCat('custom prompt here', 'Tabby');
    assert.equal(capturedPrompt, 'custom prompt here');
  });

  test('falls back to breed-based prompt when imgPrompt empty', async () => {
    let capturedPrompt;
    mock.puter.ai.txt2img = async (prompt) => { capturedPrompt = prompt; return { src: 'data:mock' }; };
    await puterApi.generateCat('', 'Siamese');
    assert.match(capturedPrompt, /Siamese/);
  });

  test('throws when puter not loaded', async () => {
    uninstallPuter();
    await assert.rejects(
      () => puterApi.generateCat('prompt', 'Tabby'),
      /Puter not loaded/
    );
  });
});

describe('generateCat img2img', () => {
  test('passes input_image and gemini model when selfieDataURL provided', async () => {
    mock.state.txt2imgResponse = { src: 'data:image/png;base64,mock' };
    await puterApi.generateCat('a cool cat', 'Toxic Capyboss', 'data:image/jpeg;base64,selfie');
    assert.equal(mock.calls.txt2img.length, 1);
    assert.equal(mock.calls.txt2img[0].options.model, 'gemini-2.5-flash-image-preview');
    assert.equal(mock.calls.txt2img[0].options.input_image, 'data:image/jpeg;base64,selfie');
    assert.equal(mock.calls.txt2img[0].options.input_image_mime_type, 'image/jpeg');
    assert.equal(mock.calls.txt2img[0].options.strength, 0.5);
  });

  test('falls back to text-only when img2img throws', async () => {
    let callCount = 0;
    mock.puter.ai.txt2img = async (prompt, options) => {
      callCount++;
      if (callCount === 1) throw new Error('img2img failed');
      return { src: 'data:image/png;base64,mock' };
    };
    const img = await puterApi.generateCat('a cool cat', 'Toxic Capyboss', 'data:image/jpeg;base64,selfie');
    assert.ok(img.src);
    assert.equal(callCount, 2);
  });

  test('does not pass input_image when selfieDataURL is null', async () => {
    mock.state.txt2imgResponse = { src: 'data:image/png;base64,mock' };
    await puterApi.generateCat('a cool cat', 'Toxic Capyboss', null);
    assert.equal(mock.calls.txt2img.length, 1);
    assert.equal(mock.calls.txt2img[0].options.model, 'gpt-image-1-mini');
    assert.equal(mock.calls.txt2img[0].options.input_image, undefined);
  });
});

describe('ensureSignedIn', () => {
  test('skips signIn when already signed in', async () => {
    mock.state.signedIn = true;
    await puterApi.ensureSignedIn();
    assert.equal(mock.calls.signIn.length, 0);
  });

  test('calls signIn when not signed in', async () => {
    mock.state.signedIn = false;
    await puterApi.ensureSignedIn();
    assert.equal(mock.calls.signIn.length, 1);
  });

  test('throws when puter not loaded', async () => {
    uninstallPuter();
    await assert.rejects(() => puterApi.ensureSignedIn(), /Puter not loaded/);
  });
});

describe('isSignedIn', () => {
  test('returns true when signed in', () => {
    mock.state.signedIn = true;
    assert.equal(puterApi.isSignedIn(), true);
  });

  test('returns false when not signed in', () => {
    mock.state.signedIn = false;
    assert.equal(puterApi.isSignedIn(), false);
  });

  test('returns false when puter not loaded', () => {
    uninstallPuter();
    assert.equal(puterApi.isSignedIn(), false);
  });
});

describe('isInsufficientFundsError', () => {
  test('matches code insufficient_funds', () => {
    const err = { code: 'insufficient_funds', message: 'some text' };
    assert.equal(puterApi.isInsufficientFundsError(err), true);
  });

  test('matches message "insufficient funds"', () => {
    const err = new Error('Insufficient funds for this operation');
    assert.equal(puterApi.isInsufficientFundsError(err), true);
  });

  test('matches message "out of credits"', () => {
    const err = new Error('You are out of credits');
    assert.equal(puterApi.isInsufficientFundsError(err), true);
  });

  test('returns false for generic error', () => {
    const err = new Error('network failure');
    assert.equal(puterApi.isInsufficientFundsError(err), false);
  });

  test('returns false for null/undefined', () => {
    assert.equal(puterApi.isInsufficientFundsError(null), false);
    assert.equal(puterApi.isInsufficientFundsError(undefined), false);
  });
});

describe('extractText (via analyzeSelfie response shapes)', () => {
  test('handles string response', async () => {
    mock.state.chatResponse = '{"cat_breed":"Tabby","img_prompt":"x"}';
    const result = await puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en');
    assert.equal(result.catBreed, 'Tabby');
  });

  test('handles response with markdown fences', async () => {
    mock.state.chatResponse = { message: { content: '```json\n{"cat_breed":"Persian","img_prompt":"y"}\n```' } };
    const result = await puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en');
    assert.equal(result.catBreed, 'Persian');
  });

  test('handles response with surrounding text', async () => {
    mock.state.chatResponse = { message: { content: 'Here is your cat: {"cat_breed":"Sphynx","img_prompt":"z"} Hope you like it!' } };
    const result = await puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en');
    assert.equal(result.catBreed, 'Sphynx');
  });

  test('handles array content response', async () => {
    mock.state.chatResponse = { message: { content: [{ type: 'text', text: '{"cat_breed":"Bengal","img_prompt":"w"}' }] } };
    const result = await puterApi.analyzeSelfie('data:image/jpeg;base64,abc', 'en');
    assert.equal(result.catBreed, 'Bengal');
  });
});

describe('normalizeImageToJPEG', () => {
  test('returns a data URL string', async () => {
    const result = await puterApi.normalizeImageToJPEG('data:image/png;base64,abc');
    assert.ok(typeof result === 'string');
    assert.match(result, /^data:image\/jpeg/);
  });
});
