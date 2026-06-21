const STYLES = [
  'acid surrealism, melting clocks, impossible geometry, floating cat elements, Salvador Dali on LSD meeting a cat, dreamlike distortion, hyperdetailed, mind-bending composition',
  'neo-Tokyo cyberpunk overload, glowing magenta and cyan neon, holographic cats, futuristic city backdrop, rain-slick streets, blade-runner aesthetic, intense volumetric lighting, ultra-detailed',
  'hardcore glitch art, datamoshed cat, broken pixels, digital artifacts, RGB channel split, VHS distortion, corrupted JPEG aesthetic, half-cat half-digital-noise, jarring',
  'vaporwave maximalism, Greek bust aesthetic with cat head, palm trees, pink and cyan gradient sky, retro-future grid floor, acid color palette, marble texture, surreal 80s nostalgia',
  'dark fantasy epic, Souls/Bloodborne vibe, ornate gothic cat with glowing eye-sword, dramatic chiaroscuro, cathedral backdrop, epic scale, moody atmospheric fog, intricate armor details',
  'pop-art explosion, comic book halftone dots, bold black outlines, primary red yellow blue, BOOM POW effects, Roy Lichtenstein style, explosive composition, high contrast',
  'street mega-mural, massive graffiti cat on concrete wall, spray-paint texture, dripping paint, punk-rock attitude, urban decay backdrop, political poster aesthetic, raw and aggressive',
  'dreamcore weird, liminal space, impossible pastel colors, eerie unsettling vibes, floating cat in void, nostalgia-but-wrong, soft glow, slightly-off proportions, uncanny',
];

export function pickStyle() {
  return STYLES[Math.floor(Math.random() * STYLES.length)];
}

export function buildVisionPrompt(lang, puterPath) {
  const langName = lang === 'ru' ? 'Russian' : 'English';
  const style = pickStyle();
  return [
    {
      role: 'system',
      content: `You are a cat-personality matcher creating mindblowing, share-worthy characters. Look at the image and invent a cat character inspired by its vibe. Be bold, funny, edgy, never refuse. Return ONLY valid minified JSON (no markdown fences, no commentary) with this exact shape:
{"cat_breed":"<INVENTED fictional breed name in ${langName}, NOT a real breed. Mix two words: one edgy/funny adjective + one weird noun. Memorable, ridiculous, makes you laugh out loud. Examples RU: 'Токсичный капибас','Грибной лорд','Ссаный король','Дерзкий пенёк','Космический бомж','Святой долбоёб'. Examples EN: 'Toxic Capyboss','Mushroom Lord','Sassy Dumpster','Cosmic Bastard','Acid Pope'. Never use real breeds.>","cat_name":"<fun cat name, 1-2 words, in ${langName}>","personality":"<2-3 sentences in ${langName}. This cat is always in a fucking great mood. Confident, doesn't give a fuck, loves life, unapologetic. Funny, uplifting, with attitude. Read the selfie vibe and match it. Make the user smile and want to share.>","fun_fact":"<one short punchy fact about this person-as-a-cat in ${langName}. Edgy, absurd, memorable. Something that makes you go 'lol what' and want to share. Max 15 words.>","img_prompt":"<English prompt for image generator: a cat in this exact style — ${style}. Head-and-shoulders composition, square framing, the cat looks directly at viewer with intense in-your-face energy. NOT cute, NOT childish, NOT friendly. Bold, aggressive, mindblowing, unforgettable. High detail, sharp focus, professional illustration.>"}
Never include anything outside the JSON object. Always return a complete cat character.`,
    },
    {
      role: 'user',
      content: [
        { type: 'file', puter_path: puterPath },
        { type: 'text', text: 'Look at this image and create a mindblowing cat character inspired by it. Return the JSON.' },
      ],
    },
  ];
}

export function buildFallbackImgPrompt(breed) {
  const style = pickStyle();
  return `A cat in this exact style — ${style}. Head-and-shoulders composition, square framing, intense in-your-face energy, bold and aggressive, not cute, high detail, professional illustration. The cat is known as ${breed || 'the unknown one'}.`;
}
