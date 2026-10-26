package com.jmisjustme.foldultra.workroom;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** JM-owned portable text operations. No provider, model or network dependency. */
public final class WorkroomText {
  private WorkroomText() {}
  public static final int MAX_TEXT=262144;
  public static String checked(String s) {
    if(s==null||s.length()>MAX_TEXT||s.indexOf('\0')>=0)
      throw new IllegalArgumentException("Use UTF-8 text up to 262,144 characters without NUL bytes");
    return s;
  }
  public static String sha256(String text) {
    try {
      byte[] b=MessageDigest.getInstance("SHA-256").digest(checked(text).getBytes(StandardCharsets.UTF_8));
      StringBuilder out=new StringBuilder();for(byte v:b)out.append(String.format(Locale.ROOT,"%02x",v&255));
      return out.toString();
    }catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
  }
  public static String stats(String text) {
    checked(text);String trim=text.trim();
    int words=trim.isEmpty()?0:trim.split("\\s+").length;
    int lines=text.isEmpty()?0:text.split("\n",-1).length;
    return words+" words · "+lines+" lines · "+text.codePointCount(0,text.length())+" characters";
  }
  public static String replace(String text,String find,String replacement) {
    checked(text);if(find==null||find.isEmpty())throw new IllegalArgumentException("Enter text to find first");
    return checked(text.replace(find,replacement));
  }
  public static String escape(String text) {
    return text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
  }
  public static String readingHtml(String text) {
    return "<!doctype html><meta name='viewport' content='width=device-width'><style>body{background:#101b2a;color:#edf4ff;font:18px/1.65 sans-serif;padding:22px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><pre>"+escape(checked(text))+"</pre>";
  }
  /** Bounded line comparison; deliberately reports positional changes, not a Git diff. */
  public static String changes(String saved,String draft) {
    String[] a=checked(saved).split("\n",-1),b=checked(draft).split("\n",-1);
    StringBuilder out=new StringBuilder();int count=0;
    for(int i=0;i<Math.max(a.length,b.length);i++){
      String old=i<a.length?a[i]:null,now=i<b.length?b[i]:null;
      if(java.util.Objects.equals(old,now))continue;
      count++;if(count<=80){out.append("Line ").append(i+1).append('\n');
        if(old!=null)out.append("− ").append(clip(old)).append('\n');
        if(now!=null)out.append("+ ").append(clip(now)).append('\n');out.append('\n');}
    }
    return count==0?"No changes from the saved revision.":count+" changed line positions\n\n"+out+(count>80?"Showing the first 80 changes.":"");
  }
  private static String clip(String s){return s.length()>180?s.substring(0,180)+"…":s;}
  public static String filename(String title) {
    String s=title.replaceAll("[^\\p{L}\\p{N}._ -]","_").trim();
    if(s.isEmpty()||s.equals(".")||s.equals(".."))s="JM_document.txt";
    return s.length()>96?s.substring(0,96):s;
  }
  /** RFC 5322 draft with MIME UTF-8 base64. No SMTP dispatch or forged From. */
  public static String message(String to,String subject,String body) {
    if(to==null||to.length()>254||!to.matches("[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+"))
      throw new IllegalArgumentException("Enter one email address without line breaks");
    if(subject==null||subject.length()>160||subject.contains("\r")||subject.contains("\n"))
      throw new IllegalArgumentException("Subject must be one line, up to 160 characters");
    StringBuilder encoded=new StringBuilder(),part=new StringBuilder();
    // Each encoded-word remains under RFC 2047's 75-character limit.
    for(int at=0;at<subject.length();){int cp=subject.codePointAt(at);String next=new String(Character.toChars(cp));
      if((part.toString()+next).getBytes(StandardCharsets.UTF_8).length>36){
        if(encoded.length()>0)encoded.append("\r\n ");
        encoded.append("=?UTF-8?B?").append(java.util.Base64.getEncoder().encodeToString(part.toString().getBytes(StandardCharsets.UTF_8))).append("?=");part.setLength(0);
      }part.append(next);at+=Character.charCount(cp);
    }
    if(part.length()>0||encoded.length()==0){if(encoded.length()>0)encoded.append("\r\n ");encoded.append("=?UTF-8?B?").append(java.util.Base64.getEncoder().encodeToString(part.toString().getBytes(StandardCharsets.UTF_8))).append("?=");}
    String data=java.util.Base64.getMimeEncoder(76,new byte[]{13,10}).encodeToString(checked(body).getBytes(StandardCharsets.UTF_8));
    return checked("To: "+to+"\r\nSubject: "+encoded+"\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\nX-Unsent: 1\r\n\r\n"+data+"\r\n");
  }
}
