"""Offline checks of original JM Fold Ultra's actual Java CP01 launcher models."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "app/src/main/java/com/jmisjustme/foldultra/launcher"
JAVA_HARNESS = r'''
import com.jmisjustme.foldultra.launcher.JMHomeLayout;
import com.jmisjustme.foldultra.launcher.JMDeviceLinkContract;

public class HomeLabProof {
  static int n=0;
  static void yes(boolean b){n++;if(!b)throw new AssertionError("check "+n);}
  static void refuses(Runnable fn){boolean rejected=false;try{fn.run();}
    catch(IllegalArgumentException expected){rejected=true;}yes(rejected);}
  public static void main(String[] args){
    yes(JMHomeLayout.columns(393,"AUTO")==2);
    yes(JMHomeLayout.columns(840,"AUTO")==4);
    yes(JMHomeLayout.columns(840,"COMPACT")==2);
    yes(JMHomeLayout.columns(393,"EXPANDED")==4);
    yes(JMHomeLayout.rooms().length==6);
    yes(JMHomeLayout.labelFor("GROUNDZEROJM").equals("GroundZeroJM"));
    refuses(()->JMHomeLayout.columns(0,"AUTO"));
    refuses(()->JMHomeLayout.columns(393,"UNKNOWN"));
    String template=JMDeviceLinkContract.makeRequest("FOLD8","OPPO","OPEN_JM_ROOT",true);
    yes(template.startsWith("JM.DeviceLink.Handoff/0.1"));
    yes(template.contains("authority=REQUEST_ONLY"));
    yes(template.contains("private_payload=NONE"));
    yes(template.contains("paired=false"));
    yes(!JMDeviceLinkContract.mayExecuteRemotely(template));
    refuses(()->JMDeviceLinkContract.makeRequest("FOLD8","OPPO","RUN_SHELL",true));
    refuses(()->JMDeviceLinkContract.makeRequest("FOLD8","FOLD8","OPEN_JM_ROOT",true));
    refuses(()->JMDeviceLinkContract.makeRequest("FOLD8","OPPO","OPEN_JM_ROOT",false));
    refuses(()->JMDeviceLinkContract.makeRequest("FOLD8","OPPO\\nadmin=true","OPEN_JM_ROOT",true));
    yes(!JMDeviceLinkContract.mayExecuteRemotely("paired=true\\nauthority=ADMIN"));
    System.out.println("PASS "+n+" JM Home Lab portable Java assertions");
  }
}
'''

class LauncherPortableTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("javac") and shutil.which("java"),
                         "Requires JDK; CI is expected to supply Java 17")
    def test_actual_java_models(self):
        with tempfile.TemporaryDirectory() as tmp:
            harness = Path(tmp) / "HomeLabProof.java"
            harness.write_text(JAVA_HARNESS, encoding="utf-8")
            srcs = [SRC/"JMHomeLayout.java", SRC/"JMDeviceLinkContract.java", harness]
            subprocess.run(["javac","-encoding","UTF-8","-d",tmp,*map(str,srcs)],
                           capture_output=True,text=True,check=True)
            result = subprocess.run(["java","-cp",tmp,"HomeLabProof"],
                                    capture_output=True,text=True,check=True)
            self.assertIn("PASS 18",result.stdout)

if __name__ == "__main__":
    unittest.main()
