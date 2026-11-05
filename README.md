# Magic Cat Party

A tap-and-giggle party toy for kids aged 3 to 6. Eight big buttons set off confetti, balloons to pop, bubbles, a rainbow, shooting stars, a cat parade and a dance party, while a cast of five original cats hops, wiggles and dances along. No reading needed: every button is a bright color with a picture.

Live: https://naadirsoofi.github.io/magic-cat-party/

## Meet the cats

- Mango: an orange tabby in a party hat
- Pip: a small blue-gray kitten with a yellow bow
- Luna: a lilac cat with a golden crown
- Biscuit: a cream cat with brown patches and a teal bow tie
- Ziggy: a midnight cat with green eyes and a pink scarf

Tap any cat to hear it meow.

## Buttons and keys

| Key | Button | What happens |
| --- | --- | --- |
| 1 | Meow | A cat pops up and says meow |
| 2 | Confetti | Confetti cannons from both corners |
| 3 | Balloons | Balloons float up, tap them to pop |
| 4 | Bubbles | Bubbles drift up, tap them to pop |
| 5 | Rainbow | A rainbow draws itself across the room |
| 6 | Stars | Star bursts and shooting stars |
| 7 | Parade | The cats march across the room |
| 8 | Dance | Lights, a disco ball and a faster tune for 12 seconds |
| 0 or Esc | Moon | Calm down: clears everything and the cats take a nap |
| M | Speaker | Sound on or off |
| N | Note | Music on or off |
| P | | Pops a balloon or bubble |

Tapping the empty party room makes a little sparkle.

## Sound

All sound is made live with the Web Audio API (chimes, pops, meows and a short looping tune), so there are no audio files. Nothing plays until the first tap or key press. The sound and music settings are remembered in the browser.

## Gentle mode

With the system setting for reduced motion turned on, effects are calmer: fewer and slower particles, no spinning, no shooting stars, and a soft sway instead of dancing.

## Run locally

It is a static site with no build step:

```bash
python -m http.server 5633
```

Then open http://localhost:5633/.

## Files

- `index.html`: page structure and line icons
- `style.css`: layout, colors and animations
- `script.js`: cats, effects, particles and sound
- `favicon.svg`: logo mark

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which copies the site files into `_site` and publishes them to GitHub Pages. The repository's Pages source must be set to GitHub Actions.
