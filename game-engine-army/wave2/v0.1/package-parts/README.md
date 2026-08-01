# Package parts

The ordered `part-00.b64` through `part-04.b64` files reconstruct the editable `JM_GAME_ENGINE_ARMY_FIVE_MAX_PUSHES_v0.1_ZIONFOLDER.zip`.

The GitHub Actions gate concatenates the parts, decodes the ZIP, verifies SHA-256 `f0169869a3b5b2951ef9ad56796c123696c17314fa45cb01d6d4c02a7dadf90e`, runs the source and built-delivery test suites, checks every output hash, and uploads the verified body.
