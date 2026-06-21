export function createPuterMock(overrides = {}) {
  const calls = {
    chat: [],
    fsWrite: [],
    fsDelete: [],
    signIn: [],
  };

  const state = {
    signedIn: false,
    chatResponse: null,
    chatShouldThrow: null,
    fsShouldThrow: null,
    txt2imgResponse: null,
    ...overrides,
  };

  const puter = {
    ai: {
      chat: async (messages, testModeOrOpts, opts) => {
        const options = typeof testModeOrOpts === 'object' ? testModeOrOpts : opts;
        calls.chat.push({ messages, options });
        if (state.chatShouldThrow) throw state.chatShouldThrow;
        if (state.chatResponse) return state.chatResponse;
        return { message: { content: '{"cat_breed":"Tabby","cat_name":"Whiskers","personality":"chill","fun_fact":"naps a lot","img_prompt":"a cute tabby cat"}' } };
      },
      txt2img: async (prompt, options) => {
        if (state.txt2imgResponse) return state.txt2imgResponse;
        const img = { src: 'data:image/png;base64,mock', alt: '' };
        return img;
      },
    },
    fs: {
      write: async (path, data) => {
        calls.fsWrite.push({ path, dataType: data?.constructor?.name });
        if (state.fsShouldThrow) throw state.fsShouldThrow;
        return { path: `~/${path}` };
      },
      delete: async (path) => {
        calls.fsDelete.push({ path });
      },
    },
    auth: {
      isSignedIn: () => state.signedIn,
      signIn: async () => {
        calls.signIn.push({});
        state.signedIn = true;
        return { username: 'test-user' };
      },
    },
  };

  return { puter, calls, state };
}

export function installPuter(puter) {
  globalThis.puter = puter;
}

export function uninstallPuter() {
  delete globalThis.puter;
}
