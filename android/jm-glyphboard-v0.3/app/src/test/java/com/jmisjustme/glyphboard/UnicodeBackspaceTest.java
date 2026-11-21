package com.jmisjustme.glyphboard;

import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class UnicodeBackspaceTest {
    @Test public void asciiUsesOneCodeUnit() {
        assertEquals(1, UnicodeBackspace.codeUnitsBeforeCursor("Hello"));
    }

    @Test public void bmpGlyphUsesOneCodeUnit() {
        assertEquals(1, UnicodeBackspace.codeUnitsBeforeCursor("JM ★"));
    }

    @Test public void emojiUsesTwoCodeUnits() {
        assertEquals(2, UnicodeBackspace.codeUnitsBeforeCursor("JM 😀"));
    }

    @Test public void supplementarySymbolUsesTwoCodeUnits() {
        assertEquals(2, UnicodeBackspace.codeUnitsBeforeCursor("JM 𝄞"));
    }

    @Test public void priorEmojiDoesNotConsumeFollowingAscii() {
        assertEquals(1, UnicodeBackspace.codeUnitsBeforeCursor("😀A"));
    }

    @Test public void missingContextFallsBackToOneCodeUnit() {
        assertEquals(1, UnicodeBackspace.codeUnitsBeforeCursor(null));
        assertEquals(1, UnicodeBackspace.codeUnitsBeforeCursor(""));
    }

    @Test public void unpairedSurrogateDoesNotDeleteTwoUnits() {
        assertEquals(1, UnicodeBackspace.codeUnitsBeforeCursor("\uD83D"));
        assertEquals(1, UnicodeBackspace.codeUnitsBeforeCursor("A\uDE00"));
    }
}
