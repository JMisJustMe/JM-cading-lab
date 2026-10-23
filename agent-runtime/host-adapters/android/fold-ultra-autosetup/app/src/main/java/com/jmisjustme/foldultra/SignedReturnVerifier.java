package com.jmisjustme.foldultra;

import org.json.JSONArray;
import org.json.JSONObject;
import android.util.Base64;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.*;
import java.util.*;

/**
 * JM Cloud v0.5.1 native verifier. No network, credential, or trust-on-first-use.
 * An externally verified public-key fingerprint MUST have been pinned by the owner.
 * Does not claim remote model/task execution, only server-persisted signal provenance.
 */
public final class SignedReturnVerifier {
  public static final String SCHEMA="JM.LivingHome.NativeSignedReturnBundle/1";
  public static final String PIN="livinghome.return.pinnedKeyId";
  private static final String CLAIM="SERVER_RETURN_SIGNATURE_VERIFIED";
  private SignedReturnVerifier(){}

  private static String sha(String value) throws Exception {
    byte[] bytes=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
    StringBuilder sb=new StringBuilder();
    for(byte b:bytes)sb.append(String.format(Locale.ROOT,"%02x",b&255));
    return sb.toString();
  }
  /** Mirrors existing Node canonical sorted-key JSON for bounded ASCII/UTF-8 mission data. */
  private static String canon(Object v)throws Exception {
    if(v==null||v==JSONObject.NULL)return "null";
    if(v instanceof JSONObject){
      JSONObject j=(JSONObject)v;
      ArrayList<String> keys=new ArrayList<>();
      Iterator<String> it=j.keys();while(it.hasNext())keys.add(it.next());
      Collections.sort(keys);
      StringBuilder b=new StringBuilder("{");
      for(String k:keys){
        if(b.length()>1)b.append(',');
        b.append(JSONObject.quote(k)).append(':').append(canon(j.get(k)));
      }
      return b.append('}').toString();
    }
    if(v instanceof JSONArray){
      JSONArray j=(JSONArray)v;
      StringBuilder b=new StringBuilder("[");
      for(int i=0;i<j.length();i++){
        if(i>0)b.append(',');
        b.append(canon(j.get(i)));
      }
      return b.append(']').toString();
    }
    if(v instanceof String)return JSONObject.quote((String)v);
    if(v instanceof Boolean)return v.toString();
    if(v instanceof Number){
      if(v instanceof Double||v instanceof Float)
        throw new IllegalArgumentException("Non-integer numbers not supported in a signed native payload");
      return v.toString();
    }
    throw new IllegalArgumentException("Unsupported signed value");
  }
  private static byte[] unb64(String s,int length)throws Exception{
    if(!s.matches("[a-zA-Z0-9_-]+"))throw new IllegalArgumentException("Invalid JWK coordinate");
    byte[] b=Base64.decode(s,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);
    if(b.length!=length)throw new IllegalArgumentException("Invalid curve coordinate length");
    return b;
  }
  private static byte[] derInteger(byte[] half){
    int i=0;while(i<half.length-1&&half[i]==0)i++;
    int n=half.length-i,lead=(half[i]&128)!=0?1:0;
    byte[] out=new byte[2+n+lead];
    out[0]=2;out[1]=(byte)(n+lead);
    System.arraycopy(half,i,out,2+lead,n);
    return out;
  }
  private static byte[] derP1363(String b64)throws Exception {
    byte[] raw=unb64(b64,64);
    byte[] a=derInteger(Arrays.copyOfRange(raw,0,32));
    byte[] b=derInteger(Arrays.copyOfRange(raw,32,64));
    int n=a.length+b.length;
    if(n>127)throw new IllegalArgumentException("Signature DER length unsupported");
    byte[] der=new byte[n+2];der[0]=0x30;der[1]=(byte)n;
    System.arraycopy(a,0,der,2,a.length);
    System.arraycopy(b,0,der,2+a.length,b.length);
    return der;
  }
  private static PublicKey jwk(JSONObject key)throws Exception {
    if(key.length()!=4||!"EC".equals(key.getString("kty"))||
       !"P-256".equals(key.getString("crv")))
       throw new IllegalArgumentException("Expected public EC P-256 JWK");
    BigInteger x=new BigInteger(1,unb64(key.getString("x"),32));
    BigInteger y=new BigInteger(1,unb64(key.getString("y"),32));
    AlgorithmParameters params=AlgorithmParameters.getInstance("EC");
    params.init(new ECGenParameterSpec("secp256r1"));
    ECParameterSpec spec=params.getParameterSpec(ECParameterSpec.class);
    java.security.spec.ECPoint point=new java.security.spec.ECPoint(x,y);
    return KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(point,spec));
  }
  private static void eq(String actual,String expected,String message){
    if(!expected.equals(actual))throw new IllegalArgumentException(message);
  }
  /** Does not stage anything on failure. Validated return is still untrusted task content. */
  public static JSONObject validate(String body,JSONObject active,int revision,String ownerPin)throws Exception {
    if(body==null||body.getBytes(StandardCharsets.UTF_8).length>CloudReturnBridge.MAX_LEDGER_BYTES)
      throw new IllegalArgumentException("Signed bundle exceeds 250 KB");
    if(ownerPin==null||!ownerPin.matches("[0-9a-f]{24}"))
      throw new IllegalStateException("Owner must independently pin server /receipt-key keyId before signed contact");
    JSONObject bundle=new JSONObject(body);
    eq(bundle.optString("schema",""),SCHEMA,"Incorrect signed bundle schema");
    JSONObject ledger=bundle.getJSONObject("ledger");
    JSONObject evidence=bundle.getJSONObject("evidence");
    JSONObject receipt=bundle.getJSONObject("signedReceipt");
    JSONObject payload=bundle.getJSONObject("signedPayload");
    JSONObject key=bundle.getJSONObject("serverPublicJwk");
    JSONObject pending=CloudReturnBridge.select(ledger.toString(),active,revision);
    eq(evidence.optString("status",""),CLAIM,"Unverified client evidence state");
    eq(evidence.getString("project"),ledger.getJSONArray("missions").getJSONObject(0).getString("project"),
       "Evidence project disagreement");
    eq(evidence.getString("project"),active.getString("title"),"Wrong active native project");
    eq(evidence.getString("sourceId"),active.getString("id"),"Wrong native source ID");
    eq(evidence.getString("missionId"),pending.getString("mission_id"),"Mission ID disagreement");
    eq(evidence.getString("challenge"),pending.getString("challenge"),"Challenge disagreement");
    if(evidence.getInt("returnSignalId")!=pending.getInt("return_signal_id"))
      throw new IllegalArgumentException("Return ID mismatch");
    String origin=evidence.getString("origin");
    if(!origin.matches("https://[a-zA-Z0-9.-]+")||origin.length()>160)
      throw new IllegalArgumentException("Only a pinned HTTPS server origin is supported");
    String keyId=sha(canon(key)).substring(0,24);
    eq(keyId,ownerPin,"Server public signing key not approved by owner");
    eq(receipt.optString("publicKeyId",""),keyId,"Signed receipt does not match owner signing key");
    eq(evidence.optString("publicKeyId",""),keyId,"Client verifier key mismatch");
    eq(receipt.getString("schema"),"jm.cloud-contact.signal-receipt/0.5","Wrong signed signal schema");
    eq(receipt.getString("signatureAlgorithm"),"ECDSA-P256-SHA256-P1363","Unrecognised signing algorithm");
    eq(receipt.getString("spaceId"),evidence.getString("spaceId"),"Signed space mismatch");
    eq(receipt.getString("from"),evidence.getString("from"),"Wrong signed sender");
    eq(receipt.getString("to"),evidence.getString("memberId"),"Wrong signed recipient");
    eq(receipt.getString("kind"),"JM_LIVING_HOME_RETURN","Wrong signed signal kind");
    if(receipt.getInt("signalId")!=pending.getInt("return_signal_id"))
      throw new IllegalArgumentException("Signed return ID mismatch");
    eq(receipt.getString("receiptHash"),evidence.getString("signalReceiptHash"),"Receipt hash disagreement");
    eq(receipt.getString("payloadSha256"),sha(canon(payload)),"Signed payload differs from stored digest");
    eq(receipt.getString("payloadSha256"),evidence.getString("payloadSha256"),"Evidence payload hash disagreement");
    eq(payload.getString("schema"),"JM.LivingHome.CloudReturn/1.0","Signed payload type mismatch");
    eq(payload.getString("missionId"),pending.getString("mission_id"),"Signed mission mismatch");
    eq(payload.getString("challenge"),pending.getString("challenge"),"Signed challenge mismatch");
    eq(payload.getString("result"),pending.getString("result"),"Signed result differs from native return");
    String proofHash=receipt.getString("receiptHash");
    if(!proofHash.matches("[0-9a-f]{64}"))throw new IllegalArgumentException("Wrong signed hash format");
    JSONObject core=new JSONObject(receipt.toString());
    for(String k:new String[]{"receiptHash","publicSig","publicKeyId","signatureAlgorithm","claimBoundary"})
      core.remove(k);
    eq(sha(canon(core)),proofHash,"Signed canonical receipt hash failed");
    PublicKey publicKey=jwk(key);
    Signature signature=Signature.getInstance("SHA256withECDSA");
    signature.initVerify(publicKey);
    signature.update(proofHash.getBytes(StandardCharsets.UTF_8));
    if(!signature.verify(derP1363(receipt.getString("publicSig"))))
      throw new IllegalArgumentException("Cryptographic ECDSA signature verification FAILED");
    pending.put("evidence_state",CLAIM);
    pending.put("server_receipt_hash",proofHash);
    pending.put("server_key_id",keyId);
    pending.put("server_origin",origin);
    return pending;
  }
}
