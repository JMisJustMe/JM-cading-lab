package com.jmisjustme.foldultra.launcher;

/** Portable, Android-free model. Layout presets are independent of device authority. */
public final class JMHomeLayout {
  public static final String AUTO="AUTO", COMPACT="COMPACT", EXPANDED="EXPANDED";
  private JMHomeLayout() {}

  public static int columns(int screenWidthDp, String mode) {
    if (screenWidthDp < 1 || screenWidthDp > 5000)
      throw new IllegalArgumentException("Unreasonable display width");
    if (COMPACT.equals(mode)) return 2;
    if (EXPANDED.equals(mode)) return 4;
    if (AUTO.equals(mode)) return screenWidthDp >= 600 ? 4 : 2;
    throw new IllegalArgumentException("Unknown layout profile");
  }

  public static String[] rooms() {
    return new String[]{"JM ROOT", "WORKROOM", "APP DRAWER", "DEVICES", "LAYOUT", "BACK TO JM"};
  }

  public static String labelFor(String identity) {
    if ("FOLD8".equals(identity)) return "Fold8 Ultra";
    if ("OPPO".equals(identity)) return "OPPO";
    if ("GROUNDZEROJM".equals(identity)) return "GroundZeroJM";
    throw new IllegalArgumentException("Unknown device role");
  }
}
