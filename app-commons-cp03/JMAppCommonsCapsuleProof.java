package com.jmisjustme.foldultra;
import java.nio.file.Files;
import java.nio.file.Path;
public final class JMAppCommonsCapsuleProof {
  private static int count=0;
  static void pass(boolean good,String message){if(!good)throw new AssertionError(message);count++;}
  static void hold(String name,Runnable test){boolean held=false;try{test.run();}catch(IllegalArgumentException e){held=true;}pass(held,name);}
  public static void main(String[] args)throws Exception{
    String valid=Files.readString(Path.of(args[0]));
    JMAppCommonsCapsule.Received r=JMAppCommonsCapsule.verify(valid);
    pass("JM Original Fold 🌍".equals(r.name),"cross-platform name");
    pass(r.snapshots==1,"snapshots");
    pass(r.source.contains("source ↔ receiver"),"cross-platform source");
    pass(r.sourceHash.equals(JMAppCommonsCapsule.sha(r.source)),"source digest");
    pass(r.evidence().contains("OWNER REVIEW REQUIRED"),"no write authority");
    hold("tampered payload",()->JMAppCommonsCapsule.verify(read(args[1])));
    hold("extra field",()->JMAppCommonsCapsule.verify(valid.replace("\"revision\": 1", "\"revision\": 1, \"escalation\": true")));
    hold("checksum replaced",()->JMAppCommonsCapsule.verify(valid.replace(r.checksum,"0".repeat(64))));
    hold("source exceeds bound",()->JMAppCommonsCapsule.verify(valid+" ".repeat(210000)));
    hold("duplicate key",()->JMAppCommonsCapsule.verify(valid.replaceFirst("\"schema\":", "\"schema\": \"JM.AppCommons.Capsule/0.1\", \"schema\":")));
    System.out.println("pass "+count);
  }
  static String read(String path){try{return Files.readString(Path.of(path));}catch(Exception e){throw new AssertionError(e);}}
}
