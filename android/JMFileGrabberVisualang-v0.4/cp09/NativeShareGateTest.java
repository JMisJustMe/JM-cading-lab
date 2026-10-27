import com.jmisjustme.filegrabbervisualang.NativeShareGate;
public class NativeShareGateTest {
    static int passed=0;
    static void check(boolean good,String label) { if (!good) throw new AssertionError(label); System.out.println("PASS "+label); passed++; }
    public static void main(String[] args) {
        check(NativeShareGate.shareAction("android.intent.action.SEND"),"one_share");
        check(NativeShareGate.shareAction("android.intent.action.SEND_MULTIPLE"),"multi_share");
        check(!NativeShareGate.shareAction("android.intent.action.VIEW"),"view_reject");
        check(!NativeShareGate.shareAction(null),"null_action");
        check(NativeShareGate.acceptedUri("content://com.android.providers.downloads.documents/document/32"),"saf_download");
        check(NativeShareGate.acceptedUri("content://com.example/document/alpha%20beta"),"encoded_file");
        check(!NativeShareGate.acceptedUri("file:///storage/emulated/0/Download/a.html"),"file_scheme_reject");
        check(!NativeShareGate.acceptedUri("https://example.com/a"),"external_network_reject");
        check(!NativeShareGate.acceptedUri("content:///body"),"no_authority_reject");
        check(!NativeShareGate.acceptedUri("content://"),"empty_content_reject");
        check(!NativeShareGate.acceptedUri("content://provider/"),"no_path_file_reject");
        check(!NativeShareGate.acceptedUri("content://provider/doc#injected"),"fragment_reject");
        check(!NativeShareGate.acceptedUri("content://user@provider/doc"),"userinfo_reject");
        check(!NativeShareGate.acceptedUri("content://provider/doc\nanything"),"newline_reject");
        check(!NativeShareGate.acceptedUri(null),"null_uri");
        check(!NativeShareGate.acceptedUri(""),"empty_uri");
        check(!NativeShareGate.acceptedUri("javascript:alert(1)"),"javascript_scheme_reject");
        check(!NativeShareGate.acceptedUri("content://provider/doc%0Avalid#fragment"),"fragment_with_encoded_control_reject");
        check(!NativeShareGate.acceptedUri("content://provider/"+"a".repeat(8200)),"oversize_reject");
        System.out.println("CP09_SHARE_GATE_PASS="+passed);
    }
}
