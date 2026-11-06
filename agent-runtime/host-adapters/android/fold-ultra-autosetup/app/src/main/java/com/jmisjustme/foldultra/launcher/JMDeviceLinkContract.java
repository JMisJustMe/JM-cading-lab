package com.jmisjustme.foldultra.launcher;

/** Request-only, human-carried contact. No pairing, credentials or execution. */
public final class JMDeviceLinkContract {
  public static final String SCHEMA="JM.DeviceLink.Handoff/0.1";
  private JMDeviceLinkContract() {}

  public static boolean validTarget(String target) {
    return "OPPO".equals(target) || "GROUNDZEROJM".equals(target)
      || "FOLD8".equals(target);
  }

  public static boolean validRequest(String action) {
    return "OPEN_JM_ROOT".equals(action) || "REQUEST_PROJECT_POINTER".equals(action);
  }

  public static String makeRequest(String from, String to, String action, boolean ownerSelected) {
    if (!ownerSelected || !validTarget(from) || !validTarget(to)
        || from.equals(to) || !validRequest(action))
      throw new IllegalArgumentException("Request must be explicitly scoped by owner");
    // Not JSON intentionally: plain text is readable in Android Sharesheet and cannot trigger execution.
    return "JM.DeviceLink.Handoff/0.1\n"
      + "authority=REQUEST_ONLY\n"
      + "from=" + from + "\n"
      + "to=" + to + "\n"
      + "request=" + action + "\n"
      + "private_payload=NONE\n"
      + "paired=false\n"
      + "recipient_must_approve=true\n";
  }

  /** No command transport exists in CP01. Pairing/approval is not implied by a text handoff. */
  public static boolean mayExecuteRemotely(String ignoredHandoff) {
    return false;
  }
}
