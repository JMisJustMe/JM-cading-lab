package com.jmisjustme.foldultra;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Browser -> original Android-compatible Java capsule organ -> browser.
 * Exact real source verifier/emit methods, fixture scoped; no device, account,
 * file write outside caller's temporary workdir or invisible model inference.
 */
public final class JMAppCommonsChromeRelay {
  public static void main(String[] args) throws Exception {
    if (args.length != 1) throw new IllegalArgumentException("Need Chrome-exported capsule path");
    String incoming = Files.readString(Path.of(args[0]), StandardCharsets.UTF_8);
    JMAppCommonsCapsule.Received verified = JMAppCommonsCapsule.verify(incoming);
    if (!verified.source.contains("cross-door candidate"))
      throw new IllegalArgumentException("HOLD: expected real browser-edited source absent");
    String original = verified.source;
    String changed = original + "\n## Native Java return proof · CP04\n";
    String outgoing = JMAppCommonsCapsule.emit(
      verified.name, changed, original, "2026-10-27T00:00:00Z",
      "Preserved browser-source ancestor");
    JMAppCommonsCapsule.Received post = JMAppCommonsCapsule.verify(outgoing);
    if (!post.source.equals(changed) || post.snapshots != 1)
      throw new IllegalStateException("HOLD: Java emitted contract mismatch");
    System.out.write(outgoing.getBytes(StandardCharsets.UTF_8));
  }
}
