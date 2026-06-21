export function buildVisionPrompt(lang) {
  const langName = lang === 'ru' ? 'Russian' : 'English';
  return [
    {
      role: 'system',
      content: `You are a playful cat-personality matcher. Look at the image and invent a cartoon cat character inspired by its mood, colors, and any visible features. Be creative and never refuse — even if you can't see a clear face, improvise based on whatever is visible (colors, setting, objects, vibe). Return ONLY valid minified JSON (no markdown fences, no commentary) with this exact shape:
{"cat_breed":"<real cat breed>","cat_name":"<fun cat name, 1-2 words, in ${langName}>","personality":"<2-3 sentences describing the cat's personality in ${langName}>","fun_fact":"<one playful fact about this person-as-a-cat in ${langName}>","img_prompt":"<detailed English prompt for a cartoon image generator: a cute cartoon-style cat of that breed, expressive, warm color palette, simple soft background, square composition, head-and-shoulders framing, friendly vibe>"}
Never include anything outside the JSON object. Always return a complete cat character.`,
    },
    {
      role: 'user',
      content: 'Look at this image and create a cat character inspired by it. Return the JSON.',
    },
  ];
}

export function buildFallbackImgPrompt(breed) {
  return `A cute cartoon ${breed || 'cat'} character, expressive eyes, warm orange and cream color palette, simple soft circular background, square composition, friendly and playful vibe, clean illustrated style.`;
}
