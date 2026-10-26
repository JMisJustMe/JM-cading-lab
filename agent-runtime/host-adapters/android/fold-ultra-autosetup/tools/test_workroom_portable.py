"""Execute the actual portable Java body. Android lifecycle has a separate lane."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
JAVA=ROOT/'app/src/main/java/com/jmisjustme/foldultra/workroom/WorkroomText.java'
HARNESS=r'''
import com.jmisjustme.foldultra.workroom.WorkroomText;
import java.util.Base64;
import java.nio.charset.StandardCharsets;
public class WorkroomProof {
  static int n=0;
  static void yes(boolean v){n++;if(!v)throw new AssertionError("check "+n);}
  static void refuses(Runnable r){boolean failed=false;try{r.run();}catch(IllegalArgumentException e){failed=true;}yes(failed);}
  public static void main(String[] args){
    yes(WorkroomText.sha256("abc").equals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
    yes(WorkroomText.replace("$x x.*", "x.*", "\\new$").equals("$x \\new$"));
    yes(WorkroomText.replace("JM JM","JM","32").equals("32 32"));
    refuses(()->WorkroomText.replace("body","","new"));
    refuses(()->WorkroomText.checked("a\0b"));
    refuses(()->WorkroomText.checked("x".repeat(262145)));
    yes(WorkroomText.checked("x".repeat(262144)).length()==262144);
    refuses(()->WorkroomText.replace("x".repeat(262144),"x","xx"));
    yes(WorkroomText.stats("JM 🎮").contains("4 characters"));
    yes(WorkroomText.readingHtml("<script>alert(1)</script>").contains("&lt;script&gt;"));
    yes(!WorkroomText.readingHtml("<script>alert(1)</script>").contains("<script>"));
    yes(WorkroomText.changes("old\nsame","new\nsame").contains("1 changed line positions"));
    yes(WorkroomText.changes("same","same").startsWith("No changes"));
    yes(WorkroomText.changes("","a\nb\nc").contains("+ c"));
    yes(WorkroomText.changes("a".repeat(500),"b").length()<500);
    yes(!WorkroomText.filename("../../evil.html").contains("/"));
    yes(!WorkroomText.filename("..").equals(".."));
    String m=WorkroomText.message("owner@example.org","JM — message","My source 🎮\nTwo lines");
    yes(m.contains("X-Unsent: 1\r\n"));yes(!m.contains("From:"));
    String decoded=new String(Base64.getMimeDecoder().decode(m.split("\r\n\r\n",2)[1]),StandardCharsets.UTF_8);
    yes(decoded.equals("My source 🎮\nTwo lines"));
    refuses(()->WorkroomText.message("owner@example.org\r\nBcc: x@y.com","Hi","body"));
    refuses(()->WorkroomText.message("owner@example.org","Hi\r\nBcc: x@y.com","body"));
    refuses(()->WorkroomText.message("not-address","Hi","body"));
    System.out.println("PASS "+n+" actual Java text, Unicode, MIME, integrity, diff and refusal checks");
  }
}
'''
class WorkroomPortable(unittest.TestCase):
    @unittest.skipUnless(shutil.which("javac"), "JDK compiler unavailable locally; required in Android CI")
    def test_actual_java_runtime(self):
        with tempfile.TemporaryDirectory() as d:
            harness=Path(d)/'WorkroomProof.java';harness.write_text(HARNESS)
            subprocess.run(['javac','-encoding','UTF-8','-d',d,str(JAVA),str(harness)],check=True,capture_output=True,text=True)
            r=subprocess.run(['java','-cp',d,'WorkroomProof'],check=True,capture_output=True,text=True)
            self.assertIn('PASS 23',r.stdout)
            print(r.stdout.strip())
if __name__=='__main__':unittest.main()
