# JMISJUSTME Living Estate — Theory Reader Repair v1.10.2

## Fault confirmed

The installed-body viewer used one iframe route for every file format. HTML games loaded, while PDF bodies depended on the browser's PDF plugin and could render as an empty surface. Plain-text bodies also depended on Android/WebView handling of `text/plain` blob URLs.

## Repair

- TXT, Markdown, JSON and CSV bodies now open through an embedded HTML reading edition.
- PDF bodies are text-extracted during packaging and open through the same dark Owner reader.
- `Keep original` downloads the exact original source file rather than the reading wrapper.
- HTML games and interactive bodies continue to open as their original HTML.
- The extracted Zionfolder edition includes matching `installed-readers/` files.

## QA

All five installed theory routes loaded visible content at 412×915:

1. Whole Human Systems / MMMBBB / VTS-DGY
2. Addictive Dismissal v1.0
3. Actual Mental Health Complete Collected Body
4. Radius Lexicon v0.5A
5. Theories (brought together)

Fight Clash Boxing v1.1 Kinetic 3D was retested as a regression and still loaded successfully.

The private Owner artifacts remain excluded from the public GitHub Pages package.