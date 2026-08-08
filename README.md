# 三顧茅廬 Three Visits

An **animatic** of the three visits to the thatched cottage at Longzhong, adapted from
*Romance of the Three Kingdoms* (三國演義), chapters 36–38. Winter 207 – spring 208 AD.

33 shots, 3 minutes 30 seconds, with a synthesised score — and it exports a real `.webm`.

Fourth in a set, after [Red Cliffs 赤壁](https://github.com/chloe4ai/red-cliffs),
[Guandu 官渡](https://github.com/chloe4ai/guandu) and
[六出祁山](https://github.com/chloe4ai/qishan).

---

## No battle at all

The first three films are wars: a river, a plain, a mountain range. This one has no army,
no fire and no siege in it. The entire story is a man riding a long way three times to
knock on a door, and being told twice that nobody is home.

That makes it the **mirror of the Qishan film**. Both are built on a returning shot. There,
repetition ends in futility — six campaigns, the same mountains, nothing gained. Here the
same device resolves: the same gate in the same bamboo fence, three times, with the season
turning behind it, until the third time it is open.

Two decisions follow from that:

- **Zhuge Liang is kept off screen for two-thirds of the film**, because his absence is the
  subject. His portrait plate — the device every other film in the set uses to introduce a
  character on arrival — is deliberately withheld until he finally wakes up.
- **The climax is a map, not an action.** The 隆中對 is the payoff, so `empireMap` is the
  one thing in the drawing library rendered with any precision: the two rivers, and the
  three shares filling in one at a time as he explains them.

| | |
|---|---|
| 薦賢 | *"Sleeping Dragon and Fledgling Phoenix. Get either one and the empire can be settled."* |
| 一顧 | Late autumn. A boy answers: *"He goes where he likes. Nobody knows where."* |
| 二顧 | Deep snow, on purpose. His brother is home; he is not. A letter is left at the gate. |
| 三顧 | Spring. He is asleep, and Liu Bei stands at the foot of the steps for two hours. |
| 隆中對 | Hold Jing and Yi, keep the passes, wait for the empire to shift. |
| 魚水 | *"My having Kongming is as a fish having water."* |

## What the drawing library gained

A thatched `cottage` with snow that can lie on it, a bamboo `fence` with a wicket gate that
can stand open, `pine` and `plumBranch`, `snowfall` and `snowDrift`, a plank `bridge`, a
tethered `horse` cropping grass, `couchAndScreen`, and `empireMap`.

Nothing military survived from the previous films except the palettes and the figure.

## Portraits

Public domain, provenance printed in-frame on each plate. Details in
[`assets/portraits/sources.json`](assets/portraits/sources.json).

| Character | Source |
|---|---|
| 劉備 Liu Bei | 清代人物畫 |
| 諸葛亮 Zhuge Liang | 《三才圖會》萬曆三十七年 (1609) |
| 關羽 Guan Yu | 清代人物畫, before 1912 |
| 張飛 Zhang Fei | 清代繡像本 |
| 司馬徽 Sima Hui | 清代繡像本 (1906) |

Swap in your own: drop a **video file** on the page and grab a frame, use the cast panel, or
put images in `characters/` — gitignored, so nothing you add is committed or uploaded.

## Running and exporting

```bash
python3 -m http.server 4795 --directory .
```

**Space** plays/pauses, **←/→** skip five seconds, clicking a shot jumps to it,
**Director's view** burns shot data into the frame.

**Export .webm** writes a real VP9 + Opus file at 1280×720. It records in real time (3:30),
and live-recorded WebM has no duration header — `ffmpeg -i in.webm -c copy out.webm` fixes
that without re-encoding. Export needs Chrome or Edge.

Adapted from **Romance of the Three Kingdoms**, attributed to Luo Guanzhong, c. 14th
century. Public domain. Code: MIT.
