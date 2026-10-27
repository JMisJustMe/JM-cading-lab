import com.jmisjustme.filegrabbervisualang.NativeVaultTruth;
import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;
public final class NativeVaultTruthTest {
  static int checks=0;
  static void test(String name, boolean got) { checks++; if(!got) throw new AssertionError(name); System.out.println("PASS "+name); }
  static String sha(byte[] data) throws Exception {
    byte[] digest=MessageDigest.getInstance("SHA-256").digest(data);
    StringBuilder s=new StringBuilder();for(byte b:digest)s.append(String.format(Locale.ROOT,"%02x",b));return s.toString();
  }
  public static void main(String[] a) throws Exception {
    Path root=Files.createTempDirectory("jm-cp08-vault-");
    try {
      test("app root",NativeVaultTruth.isAppUrl("https://jm.app/"));
      test("app index",NativeVaultTruth.isAppUrl("https://jm.app/index.html"));
      for(String url:new String[]{"http://jm.app/index.html","https://jm.app.evil/index.html","https://evil.tld/","https://jm.app/%2findex.html","https://jm.app/index.html?file=x","https://jm.app/index.html#x","https://jm.app:443/index.html","https://user@jm.app/index.html","file:///android_asset/index.html","https://jm.app/other","javascript:alert(1)"}) test("reject origin: "+url,!NativeVaultTruth.isAppUrl(url));
      byte[] raw="JM exact bytes: \u03bb, emojis \uD83D\uDD25, zero\u0000 embedded".getBytes("UTF-8");
      String digest=sha(raw); String name=digest+"_buildcad.html";
      Path target=root.resolve(name);Files.write(target,raw);
      test("vault URL", NativeVaultTruth.isVaultUrl("https://jm.vault/body/"+digest));
      for(String url:new String[]{"http://jm.vault/body/"+digest,"https://jm.vault.evil/body/"+digest,"https://jm.vault/body/"+digest+"/more","https://jm.vault/body/"+digest+"?x=1","https://jm.vault:443/body/"+digest,"https://jm.vault/body/..%2f","https://jm.vault/body/"+digest.toUpperCase(Locale.ROOT),"https://jm.vault/body/"+digest+"#frag"})test("reject vault URL: "+url,!NativeVaultTruth.isVaultUrl(url));
      test("verified full bytes", NativeVaultTruth.verify(root.toFile(),name,digest,raw.length));
      test("reject wrong length",!NativeVaultTruth.verify(root.toFile(),name,digest,raw.length-1));
      test("reject wrong digest",!NativeVaultTruth.verify(root.toFile(),name,"f".repeat(64),raw.length));
      test("reject bogus filename",!NativeVaultTruth.verify(root.toFile(),"incoming_abcd",digest,raw.length));
      test("reject traversal",!NativeVaultTruth.verify(root.toFile(),"../"+name,digest,raw.length));
      test("reject no file",!NativeVaultTruth.verify(root.toFile(),digest+"_missing.bin",digest,raw.length));
      test("reject negative size",!NativeVaultTruth.verify(root.toFile(),name,digest,-1));
      test("reject missing metadata",!NativeVaultTruth.verify(root.toFile(),null,digest,raw.length));
      Files.write(target,"changed but same length?".getBytes("UTF-8"));
      test("tamper detected",!NativeVaultTruth.verify(root.toFile(),name,digest,raw.length));
      Files.write(target,raw);
      test("restoration after tamper fixed",NativeVaultTruth.verify(root.toFile(),name,digest,raw.length));
      Path outside=Files.createTempFile("jm-cp08-outside", "bin"); Files.write(outside,raw);
      Files.delete(target); Files.createSymbolicLink(target,outside);
      test("symlink escape prevented",!NativeVaultTruth.verify(root.toFile(),name,digest,raw.length));
      Files.deleteIfExists(outside);
      String veryLongName=digest+"_"+"a".repeat(150);
      Files.write(root.resolve(veryLongName),raw);
      test("inherited old-name support",NativeVaultTruth.verify(root.toFile(),veryLongName,digest,raw.length));
      System.out.println("TOTAL "+checks+"/"+checks+" PASS");
    } finally {
      try(var walk=Files.walk(root)) { walk.sorted(Comparator.reverseOrder()).forEach(p->{try {Files.deleteIfExists(p);}catch(Exception ignored){}}); }
    }
  }
}
