package com.jmisjustme.foldultra;
import java.nio.file.*;
public final class JMAppCommonsExtendedProof{
 public static void main(String[] args)throws Exception{
   int passed=0;
   for(int i=0;i<64;i++){
     String json=Files.readString(Path.of(args[0],String.format("js-%02d.json",i)));
     var c=JMAppCommonsCapsule.verify(json);
     if(!c.name.equals("JM "+i+" 🌍")||c.snapshots!=1||!c.source.contains("stage "+i))throw new AssertionError("case "+i);
     passed++;
   }
   System.out.println("Java receives independent JS capsules "+passed+"/64 PASS");
   String[] tests={"", "é 😎\nNewlines", "𐐷 🦋"};
   for(String s:tests){String emitted=JMAppCommonsCapsule.emit("Native Roundtrip",s,s,"2026-10-26T20:27:00Z","Native");
      JMAppCommonsCapsule.verify(emitted);
      System.out.println("EMITTED:"+emitted);
   }
 }
}
