/**
 * film.js — the screenplay.
 *
 * Adapted from Romance of the Three Kingdoms (三國演義), attributed to Luo
 * Guanzhong, c. 14th century — public domain. Chapters 36–38: the three visits
 * to the thatched cottage at Longzhong, winter 207 – spring 208 AD.
 *
 * There is no battle in this one. No armies, no fire, no siege — the entire
 * story is a man riding a long way three times to knock on a door, and being
 * told twice that nobody is home.
 *
 * Structurally it is the mirror of the Qishan film. Both are built on a
 * returning shot; there, repetition ends in futility, and here it ends in the
 * door opening. So the spine is the same setup three times — the gate in the
 * bamboo fence — with the season turning behind it, and the man they came for
 * kept off screen entirely until the third time. His portrait plate is
 * withheld to the same beat, because the film's subject is his absence.
 *
 * cam: [x, y, zoom] start → end, in fractions of frame. Zoom 1 = full frame.
 */

export const META = {
  title: 'THREE VISITS',
  titleZh: '三顧茅廬',
  source: 'Romance of the Three Kingdoms, ch. 36–38 · Luo Guanzhong · public domain',
  format: 'Animatic / previsualisation',
};

const SEC = (n) => n;

export const SHOTS = [
  /* ------------------------------- 薦賢 ---------------------------------- */
  {
    scene: 'titleCard', dur: SEC(5.5), palette: 'ink', trans: 'fade', cue: 'silence',
    slug: 'MAIN TITLE',
    action: 'Ink on paper. The title bleeds into the fibre and settles.',
    card: { zh: '三顧茅廬', en: 'THREE VISITS' },
    footer: 'from ROMANCE OF THE THREE KINGDOMS',
  },
  {
    scene: 'recluseTalk', dur: SEC(7), palette: 'quiet', trans: 'dissolve', cue: 'guqin',
    cam: [0.5, 0.52, 1.18, 0.5, 0.5, 1.03],
    slug: 'EXT. A HERMIT\'S GATE, XINYE — DUSK',
    action: 'A man who has lost every province he has ever held is being told where to look for help.',
    sub: 'Winter, 207 AD. Liu Bei is forty-six and holds one small county.',
    fx: { figures: 2 },
  },
  {
    scene: 'characterPlate', dur: SEC(4), palette: 'ink', trans: 'cut', cue: 'strings',
    portrait: 'sima-hui',
    slug: 'CHARACTER PLATE — SIMA HUI',
    action: 'Portrait plate. Qing dynasty illustrated edition, 1906.',
  },
  {
    scene: 'recluseTalk', dur: SEC(7.5), palette: 'quiet', trans: 'cut', cue: 'guqin',
    cam: [0.46, 0.5, 1.28, 0.54, 0.5, 1.2],
    slug: 'EXT. THE HERMIT\'S GATE — CONTINUOUS',
    action: 'He will not take the post himself, and will not be pressed. He gives two names and no address worth the word.',
    portrait: 'sima-hui',
    speaker: 'SIMA HUI', line: '臥龍、鳳雛，二人得一，可安天下。',
    sub: '"Sleeping Dragon and Fledgling Phoenix. Get either one of them and the empire can be settled."',
    fx: { figures: 2, named: true },
  },
  {
    scene: 'characterPlate', dur: SEC(4.2), palette: 'ink', trans: 'cut', cue: 'strings',
    portrait: 'liu-bei',
    slug: 'CHARACTER PLATE — LIU BEI',
    action: 'Portrait plate. Qing dynasty portrait.',
  },

  /* ------------------------------- 一顧 ---------------------------------- */
  {
    scene: 'chapterCard', dur: SEC(3.4), palette: 'ink', trans: 'fade', cue: 'silence',
    slug: 'CHAPTER CARD',
    action: 'Ink title.',
    card: { zh: '一顧', en: 'THE FIRST VISIT' },
  },
  {
    scene: 'ridingThere', dur: SEC(7), palette: 'quiet', trans: 'dissolve', cue: 'drone',
    cam: [0.5, 0.55, 1.2, 0.5, 0.48, 1.02],
    slug: 'EXT. THE ROAD TO LONGZHONG — DAY',
    action: 'Three men riding a long way out of their own territory to call on a farmer nobody has heard of.',
    sub: 'Longzhong is twenty li outside Xiangyang. They ride out three times.',
    fx: { season: 'quiet', riders: 3 },
  },
  {
    scene: 'cottageGate', dur: SEC(8), palette: 'quiet', trans: 'cut', cue: 'hold',
    cam: [0.5, 0.55, 1.22, 0.5, 0.5, 1.04],
    slug: 'EXT. THE COTTAGE, LONGZHONG — DAY',
    action: 'A thatched roof behind a bamboo fence, a stream, a plank bridge. Smaller than any of them expected.',
    sub: 'A boy answers the gate.',
    fx: { visit: 1, season: 'quiet', gateOpen: false, atGate: 3, lit: 0, boy: true },
  },
  {
    scene: 'cottageGate', dur: SEC(6.5), palette: 'quiet', trans: 'cut', cue: 'unease',
    cam: [0.5, 0.5, 1.05, 0.5, 0.5, 1.2],
    slug: 'EXT. THE COTTAGE — CONTINUOUS',
    action: 'The boy does not know where he has gone, or when he is coming back, and is not troubled by either.',
    speaker: 'THE BOY', line: '踪跡不定，不知何處去了。',
    sub: '"He goes where he likes. Nobody knows where."',
    fx: { visit: 1, season: 'quiet', gateOpen: false, atGate: 3, lit: 0, boy: true },
  },
  {
    scene: 'characterPlate', dur: SEC(4), palette: 'ink', trans: 'cut', cue: 'unease',
    portrait: 'zhang-fei',
    slug: 'CHARACTER PLATE — ZHANG FEI',
    action: 'Portrait plate. Qing dynasty illustrated edition.',
  },
  {
    scene: 'ridingThere', dur: SEC(6), palette: 'quiet', trans: 'cut', cue: 'unease',
    cam: [0.5, 0.5, 1.1, 0.5, 0.52, 1.26],
    slug: 'EXT. THE ROAD BACK — DUSK',
    action: 'Zhang Fei has views about riding half a day to be told a stranger is out.',
    portrait: 'zhang-fei',
    speaker: 'ZHANG FEI', line: '既不見，自歸去罷了，何必等他！',
    sub: '"He isn\'t here. Let\'s go home. Why wait on him?"',
    fx: { season: 'quiet', riders: 3, returning: true },
  },

  /* ------------------------------- 二顧 ---------------------------------- */
  {
    scene: 'chapterCard', dur: SEC(3.4), palette: 'ink', trans: 'fade', cue: 'silence',
    slug: 'CHAPTER CARD',
    action: 'Ink title.',
    card: { zh: '二顧', en: 'THE SECOND VISIT' },
  },
  {
    scene: 'ridingThere', dur: SEC(7), palette: 'snow', trans: 'dissolve', cue: 'drone',
    cam: [0.5, 0.52, 1.22, 0.5, 0.5, 1.03],
    slug: 'EXT. THE ROAD TO LONGZHONG — SNOW',
    action: 'They go back in the middle of a blizzard, because he says the weather will show he is serious.',
    sub: 'He goes back in deep winter, on purpose.',
    fx: { season: 'snow', riders: 3 },
  },
  {
    scene: 'cottageGate', dur: SEC(8), palette: 'snow', trans: 'cut', cue: 'hold',
    cam: [0.5, 0.55, 1.2, 0.5, 0.5, 1.02],
    slug: 'EXT. THE COTTAGE — SNOW',
    action: 'The same view under snow. The same closed gate. Someone is singing inside, and it is not him.',
    sub: 'His younger brother is home. He is not.',
    fx: { visit: 2, season: 'snow', gateOpen: false, atGate: 3, lit: 0.35, boy: false },
  },
  {
    scene: 'cottageGate', dur: SEC(7.5), palette: 'snow', trans: 'cut', cue: 'strings',
    cam: [0.5, 0.5, 1.08, 0.5, 0.48, 1.24],
    slug: 'EXT. THE COTTAGE — CONTINUOUS',
    action: 'He writes a letter at the gate, in the snow, and leaves it, and rides back.',
    sub: 'He leaves a letter and rides back.',
    fx: { visit: 2, season: 'snow', gateOpen: false, atGate: 3, lit: 0.35, letter: true },
  },
  {
    scene: 'characterPlate', dur: SEC(4), palette: 'ink', trans: 'cut', cue: 'unease',
    portrait: 'guan-yu',
    slug: 'CHARACTER PLATE — GUAN YU',
    action: 'Portrait plate. Qing dynasty portrait, before 1912.',
  },
  {
    scene: 'ridingThere', dur: SEC(7), palette: 'snow', trans: 'cut', cue: 'unease',
    cam: [0.5, 0.5, 1.12, 0.5, 0.5, 1.28],
    slug: 'EXT. THE ROAD BACK — SNOW',
    action: 'Guan Yu puts it more carefully than his brother, and means the same thing.',
    portrait: 'guan-yu',
    speaker: 'GUAN YU', line: '恐此人徒有虛名而無實學，故避而不敢見。',
    sub: '"Perhaps the man is a reputation and nothing behind it, and is avoiding us because he knows it."',
    fx: { season: 'snow', riders: 3, returning: true },
  },

  /* ------------------------------- 三顧 ---------------------------------- */
  {
    scene: 'chapterCard', dur: SEC(3.6), palette: 'ink', trans: 'fade', cue: 'silence',
    slug: 'CHAPTER CARD',
    action: 'Ink title.',
    card: { zh: '三顧', en: 'THE THIRD VISIT' },
  },
  {
    scene: 'ridingThere', dur: SEC(6.5), palette: 'spring', trans: 'dissolve', cue: 'guqin',
    cam: [0.5, 0.52, 1.18, 0.5, 0.5, 1.02],
    slug: 'EXT. THE ROAD TO LONGZHONG — SPRING',
    action: 'The third time, in spring. He fasts for three days first and dismounts half a li from the fence.',
    sub: 'Spring, 208 AD. He dismounts half a li away and walks.',
    fx: { season: 'spring', riders: 3, walking: true },
  },
  {
    scene: 'cottageGate', dur: SEC(7), palette: 'spring', trans: 'cut', cue: 'hold',
    cam: [0.5, 0.55, 1.18, 0.5, 0.5, 1.03],
    slug: 'EXT. THE COTTAGE — DAY',
    action: 'The same view a third time, in leaf. The gate is open. He is at home, and asleep.',
    sub: 'He is at home. He is asleep.',
    fx: { visit: 3, season: 'spring', gateOpen: true, atGate: 3, lit: 0.5, boy: true },
  },
  {
    scene: 'waiting', dur: SEC(8), palette: 'spring', trans: 'cut', cue: 'hold',
    cam: [0.5, 0.5, 1.1, 0.5, 0.5, 1.16],
    slug: 'INT./EXT. THE COTTAGE DOOR — DAY',
    action: 'Liu Bei will not have him woken. He stands at the foot of the steps with his hands together and waits.',
    sub: 'He will not let anyone wake him.',
    fx: { hours: 0, sleeping: true },
  },
  {
    scene: 'waiting', dur: SEC(8), palette: 'spring', trans: 'cut', cue: 'hold',
    cam: [0.5, 0.5, 1.16, 0.5, 0.5, 1.16],
    slug: 'INT./EXT. THE COTTAGE DOOR — LATER',
    action: 'The light moves across the floor. Zhang Fei wants to set fire to the back of the house. He is still standing there.',
    sub: 'Two hours. He is still standing there.',
    fx: { hours: 1, sleeping: true, restless: true },
  },
  {
    scene: 'interior', dur: SEC(8), palette: 'spring', trans: 'cut', cue: 'swell',
    cam: [0.5, 0.5, 1.24, 0.5, 0.5, 1.06],
    slug: 'INT. THE COTTAGE — DAY',
    action: 'He turns over, and says a poem to the ceiling before he has opened his eyes or been told anyone is there.',
    speaker: 'ZHUGE LIANG', line: '大夢誰先覺？平生我自知。草堂春睡足，窗外日遲遲。',
    sub: '"Who wakes first from the great dream? All my life I have known. Spring sleep in the thatched hall is enough — and outside the window the sun is slow."',
    fx: { waking: true },
  },
  {
    scene: 'characterPlate', dur: SEC(5), palette: 'ink', trans: 'cut', cue: 'ritual',
    portrait: 'zhuge-liang',
    slug: 'CHARACTER PLATE — ZHUGE LIANG',
    action: 'Portrait plate, withheld until now. Sancai Tuhui, 1609.',
  },

  /* ------------------------------ 隆中對 --------------------------------- */
  {
    scene: 'chapterCard', dur: SEC(3.6), palette: 'ink', trans: 'fade', cue: 'silence',
    slug: 'CHAPTER CARD',
    action: 'Ink title.',
    card: { zh: '隆中對', en: 'THE LONGZHONG PLAN' },
  },
  {
    scene: 'longzhongPlan', dur: SEC(7.5), palette: 'spring', trans: 'dissolve', cue: 'strings',
    cam: [0.5, 0.52, 1.2, 0.5, 0.5, 1.04],
    slug: 'INT. THE COTTAGE — DAY',
    action: 'A map is brought out. It has clearly been ready for some time.',
    sub: 'He has a map already drawn.',
    fx: { reveal: 0, figures: 2 },
  },
  {
    scene: 'longzhongPlan', dur: SEC(8), palette: 'spring', trans: 'cut', cue: 'strings',
    cam: [0.5, 0.5, 1.12, 0.5, 0.5, 1.24],
    slug: 'INT. THE COTTAGE — CONTINUOUS',
    action: 'The north is Cao Cao\'s and cannot be taken. The south-east is the Sun family\'s and should be an ally, not a target.',
    speaker: 'ZHUGE LIANG', line: '曹操已擁百萬之眾，此誠不可與爭鋒。',
    sub: '"Cao Cao has a million men. He cannot be met head on."',
    fx: { reveal: 0.66, figures: 2 },
  },
  {
    scene: 'longzhongPlan', dur: SEC(8.5), palette: 'spring', trans: 'cut', cue: 'swell',
    cam: [0.5, 0.5, 1.24, 0.5, 0.48, 1.1],
    slug: 'INT. THE COTTAGE — CONTINUOUS',
    action: 'What is left is the middle and the west. Take Jing, then take Yi, hold them, wait for the north to make a mistake.',
    speaker: 'ZHUGE LIANG', line: '若跨有荊、益，保其巖阻，天下有變，則霸業可成。',
    sub: '"Hold Jing and Yi, keep the passes, and wait for the empire to shift. Then it can be done."',
    fx: { reveal: 1, figures: 2 },
  },
  {
    scene: 'longzhongPlan', dur: SEC(7), palette: 'spring', trans: 'cut', cue: 'hold',
    cam: [0.5, 0.48, 1.3, 0.5, 0.5, 1.14],
    slug: 'INT. THE COTTAGE — CONTINUOUS',
    action: 'A man with one county has just been handed the next fifty years, drawn on silk, by someone who has never left this valley.',
    sub: 'He is twenty-six years old, and has never held office.',
    fx: { reveal: 1, figures: 2, quiet: true },
  },

  /* ------------------------------- 魚水 ---------------------------------- */
  {
    scene: 'departure', dur: SEC(7), palette: 'spring', trans: 'dissolve', cue: 'aftermath',
    cam: [0.5, 0.52, 1.2, 0.5, 0.5, 1.02],
    slug: 'EXT. THE COTTAGE — DAY',
    action: 'Four ride back where three rode out. Guan Yu and Zhang Fei still have their doubts, and say so.',
    sub: 'They ride back with him.',
    fx: { riders: 4, doubt: true },
  },
  {
    scene: 'departure', dur: SEC(7.5), palette: 'spring', trans: 'cut', cue: 'end',
    cam: [0.5, 0.5, 1.1, 0.5, 0.5, 1.24],
    slug: 'EXT. THE ROAD — CONTINUOUS',
    action: 'Liu Bei settles it in one sentence and does not discuss it again.',
    portrait: 'liu-bei',
    speaker: 'LIU BEI', line: '孤之有孔明，猶魚之有水也。',
    sub: '"My having Kongming is as a fish having water."',
    fx: { riders: 4, doubt: false },
  },
  {
    scene: 'cottageGate', dur: SEC(7), palette: 'spring', trans: 'dissolve', cue: 'aftermath',
    cam: [0.5, 0.5, 1.0, 0.5, 0.5, 1.1],
    slug: 'EXT. THE COTTAGE — DAY',
    action: 'The same view, a fourth time. Nobody at the gate, nobody inside, the door left standing open.',
    sub: 'He would not come back here for twenty-seven years.',
    fx: { visit: 0, season: 'spring', gateOpen: true, atGate: 0, lit: 0 },
  },
  {
    scene: 'endCard', dur: SEC(8.5), palette: 'ink', trans: 'fade', cue: 'end',
    slug: 'END CARD',
    action: 'Ink on paper.',
    card: { zh: '三顧茅廬', en: 'THREE VISITS' },
    footer: 'Romance of the Three Kingdoms · Luo Guanzhong · c. 14th century',
  },
];

export const RUNTIME = SHOTS.reduce((a, s) => a + s.dur, 0);

/**
 * Cumulative start time of each shot, so the scrubber can seek.
 *
 * Shot numbers are derived from position rather than authored, so inserting a
 * shot mid-reel doesn't require renumbering everything after it.
 */
export const TIMELINE = (() => {
  let t = 0;
  return SHOTS.map((s, i) => {
    const entry = { ...s, id: i + 1, start: t, end: t + s.dur };
    t += s.dur;
    return entry;
  });
})();

export function shotAt(time) {
  for (const s of TIMELINE) if (time >= s.start && time < s.end) return s;
  return TIMELINE[TIMELINE.length - 1];
}
