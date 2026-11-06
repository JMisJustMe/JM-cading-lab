package com.jmisjustme.foldultra.launcher;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;

/**
 * Pure Java, Android-free tile configuration for the existing JM Fold Ultra Home Lab.
 * Each phone profile stores its OWN selected tile order. No apps or original JM sessions
 * are modified. "JM ROOT" and "BACK TO JM" are intentionally impossible to hide.
 */
public final class JMHomeMenu {
  private static final String[] DEFAULT={
    "ROOT","WORKROOM","DRAWER","DEVICES","LAYOUT","BACK"
  };
  private JMHomeMenu() {}

  public static String defaultOrder() {
    return String.join(",",DEFAULT);
  }

  public static String[] tokens(String encoded) {
    if(encoded==null || encoded.length()>95)
      throw new IllegalArgumentException("Missing or oversized home menu");
    String[] parts=encoded.split(",",-1);
    if(parts.length<2 || parts.length>DEFAULT.length)
      throw new IllegalArgumentException("Invalid tile count");
    HashSet<String> seen=new HashSet<>();
    for(String token:parts)
      if(!allowed(token)||!seen.add(token))
        throw new IllegalArgumentException("Unknown or duplicate menu tile");
    if(!seen.contains("ROOT") || !seen.contains("BACK"))
      throw new IllegalArgumentException("Protected original return routes missing");
    return parts;
  }

  public static String[] safeTokens(String raw) {
    try { return tokens(raw); }
    catch(IllegalArgumentException e) { return tokens(defaultOrder()); }
  }

  public static boolean allowed(String token) {
    for(String known:DEFAULT)if(known.equals(token))return true;
    return false;
  }

  public static String label(String token) {
    if("ROOT".equals(token))return "JM ROOT";
    if("WORKROOM".equals(token))return "WORKROOM";
    if("DRAWER".equals(token))return "APP DRAWER";
    if("DEVICES".equals(token))return "DEVICES";
    if("LAYOUT".equals(token))return "LAYOUT";
    if("BACK".equals(token))return "BACK TO JM";
    throw new IllegalArgumentException("Unknown menu tile");
  }

  public static String move(String raw,String target,int direction) {
    if(direction!=1 && direction!=-1)throw new IllegalArgumentException("Only one step");
    String[] list=tokens(raw);
    int pos=Arrays.asList(list).indexOf(target);
    if(pos<0)throw new IllegalArgumentException("Tile not visible");
    int next=pos+direction;
    if(next<0 || next>=list.length)return String.join(",",list);
    String t=list[next];list[next]=list[pos];list[pos]=t;
    return String.join(",",list);
  }

  public static String toggle(String raw,String target) {
    if(!allowed(target) || "ROOT".equals(target)||"BACK".equals(target))
      throw new IllegalArgumentException("Protected or unknown tile");
    ArrayList<String> next=new ArrayList<>(Arrays.asList(tokens(raw)));
    if(next.contains(target))next.remove(target);
    else next.add(target);
    return String.join(",",next);
  }
}
