package com.jmisjustme.foldultra;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * CP02 independent JVM/Android-compatible read-only passport receiver.
 * Parses and validates the exact JM.AppCommons.Capsule/0.1 contract before
 * any caller can ask the owner to adopt source into a native work buffer.
 * No Android, network, provider, filesystem or writing permission required.
 */
public final class JMAppCommonsCapsule {
  public static final String SCHEMA="JM.AppCommons.Capsule/0.1";
  public static final int MAX_CAPSULE_BYTES=200000;
  private JMAppCommonsCapsule() {}

  public static final class Received {
    public final String name, source, checksum, sourceHash;
    public final int snapshots;
    private Received(String name,String source,String checksum,String sourceHash,int snapshots){
      this.name=name;this.source=source;this.checksum=checksum;this.sourceHash=sourceHash;this.snapshots=snapshots;
    }
    public String evidence(){return "JM APP//COMMONS RECEIVED · VERIFIED\n"+name+"\nSHA-256 "+sourceHash+"\nSnapshots "+snapshots+"\nCapsule "+checksum+"\nOWNER REVIEW REQUIRED · NO WRITES";}
  }
  static String sha(String text){
    try {
      byte[] raw=MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
      StringBuilder b=new StringBuilder(64);
      for(byte x:raw)b.append(Character.forDigit((x>>4)&15,16)).append(Character.forDigit(x&15,16));
      return b.toString();
    }catch(Exception e){throw new IllegalStateException(e);}
  }
  static void require(boolean pass,String message){if(!pass)throw new IllegalArgumentException("HOLD: "+message);}
  static String str(Object o,String what){require(o instanceof String,what+" must be text");return (String)o;}
  static Map<String,Object> object(Object o,String what){require(o instanceof Map,what+" must be an object");return (Map<String,Object>)o;}
  static List<Object> list(Object o,String what){require(o instanceof List,what+" must be an array");return (List<Object>)o;}
  static void keys(Map<String,Object> o,String... expected){
    require(o.size()==expected.length,"unexpected object fields");
    for(String k:expected)require(o.containsKey(k),"missing "+k);
  }
  static String text(Object v,String name,int limit){
    String s=str(v,name); require(s.length()<=limit,"too-long "+name);
    for(int i=0;i<s.length();i++){
      char c=s.charAt(i);require(c!=0,"NUL in "+name);
      if(Character.isHighSurrogate(c)){
        require(i+1<s.length()&&Character.isLowSurrogate(s.charAt(i+1)),"unpaired surrogate in "+name);i++;
      }else require(!Character.isLowSurrogate(c),"unpaired surrogate in "+name);
    }
    return s;
  }
  /** Native → portable capsule: never sends or persists data automatically. */
  public static String emit(String name,String source,String saved,String created,String label){
    name=text(name,"project name",80);
    require(!name.trim().isEmpty()&&name.equals(name.trim()),"invalid name");
    source=text(source,"working source",10000);
    List<Object> snaps=new ArrayList<>();
    if(saved!=null){
      saved=text(saved,"native snapshot",10000);
      Map<String,Object> one=new LinkedHashMap<>();
      one.put("text",saved);one.put("hash",sha(saved));
      one.put("created",text(created,"created",64));one.put("label",text(label,"label",80));
      snaps.add(one);
    }
    Map<String,Object> payload=new LinkedHashMap<>();
    payload.put("schema",SCHEMA);payload.put("name",name);
    payload.put("source",source);payload.put("sourceHash",sha(source));
    payload.put("snapshots",snaps);payload.put("origin","JM APP//COMMONS · LOCAL ONLY");
    payload.put("authority","OWNER_REVIEW_REQUIRED");payload.put("revision",1);
    Map<String,Object> envelope=new LinkedHashMap<>();
    envelope.put("payload",payload);envelope.put("checksum",sha(stable(payload)));
    String emitted=stable(envelope);verify(emitted);return emitted;
  }
  public static Received verify(String raw){
    require(raw!=null&&raw.getBytes(StandardCharsets.UTF_8).length<=MAX_CAPSULE_BYTES,"capsule exceeds 200KB bound");
    Map<String,Object> cap=object(new Json(raw).parse(),"envelope");
    keys(cap,"payload","checksum");
    String checksum=str(cap.get("checksum"),"checksum");
    require(checksum.matches("[a-f0-9]{64}"),"invalid checksum format");
    Map<String,Object> p=object(cap.get("payload"),"payload");
    keys(p,"schema","name","source","sourceHash","snapshots","origin","authority","revision");
    require(SCHEMA.equals(p.get("schema")),"unsupported schema");
    require("JM APP//COMMONS · LOCAL ONLY".equals(p.get("origin")),"unexpected origin");
    require("OWNER_REVIEW_REQUIRED".equals(p.get("authority")),"authority escalation");
    require(Integer.valueOf(1).equals(p.get("revision")),"unsupported revision");
    require(sha(stable(p)).equals(checksum),"payload checksum mismatch");
    String name=text(p.get("name"),"name",80);
    require(!name.trim().isEmpty()&&name.trim().equals(name),"invalid project name");
    String source=text(p.get("source"),"source",10000);
    String sourceHash=str(p.get("sourceHash"),"sourceHash");
    require(sha(source).equals(sourceHash),"source digest mismatch");
    List<Object> snapshots=list(p.get("snapshots"),"snapshots");
    require(snapshots.size()<=12,"too many snapshots");
    for(Object obj:snapshots){
      Map<String,Object> s=object(obj,"snapshot");keys(s,"text","hash","created","label");
      String snippet=text(s.get("text"),"snapshot text",10000);
      require(sha(snippet).equals(str(s.get("hash"),"hash")),"snapshot digest mismatch");
      text(s.get("created"),"created",64);text(s.get("label"),"label",80);
    }
    return new Received(name,source,checksum,sourceHash,snapshots.size());
  }
  static String quoted(String s){
    StringBuilder b=new StringBuilder("\"");
    for(int i=0;i<s.length();i++){
      char ch=s.charAt(i);
      switch(ch){case '"':b.append("\\\"");break;case '\\':b.append("\\\\");break;
      case '\n':b.append("\\n");break;case '\r':b.append("\\r");break;
      case '\t':b.append("\\t");break;case '\b':b.append("\\b");break;
      case '\f':b.append("\\f");break;
      default:if(ch<32)b.append(String.format(java.util.Locale.ROOT,"\\u%04x",(int)ch));else b.append(ch);
      }
    }
    return b.append('"').toString();
  }
  // Canonical code-unit key order matches JavaScript stableJSON's Array.sort().
  static String stable(Object value){
    if(value==null)return "null";
    if(value instanceof String)return quoted((String)value);
    if(value instanceof Integer||value instanceof Boolean)return value.toString();
    if(value instanceof List){
      List<String> parts=new ArrayList<>();for(Object v:(List<?>)value)parts.add(stable(v));
      return "["+String.join(",",parts)+"]";
    }
    Map<String,Object> map=object(value,"canonical payload");
    List<String> keys=new ArrayList<>(map.keySet());Collections.sort(keys);
    List<String> parts=new ArrayList<>();for(String k:keys)parts.add(quoted(k)+":"+stable(map.get(k)));
    return "{"+String.join(",",parts)+"}";
  }
  /** Strict bounded JSON, rejecting duplicate keys, malformed escapes and noninteger numerics. */
  static final class Json {
    final String s;int pos=0;
    Json(String source){s=source;}
    void ws(){while(pos<s.length()&&" \t\n\r".indexOf(s.charAt(pos))>=0)pos++;}
    char take(){require(pos<s.length(),"unexpected end of JSON");return s.charAt(pos++);}
    void want(char ch){ws();require(take()==ch,"expected '"+ch+"'");}
    Object parse(){Object v=value(0);ws();require(pos==s.length(),"trailing JSON");return v;}
    Object value(int depth){require(depth<24,"excessive nesting");ws();require(pos<s.length(),"unexpected end");
      char c=s.charAt(pos);
      if(c=='"')return string();
      if(c=='{'){
        pos++;Map<String,Object> map=new LinkedHashMap<>();ws();if(pos<s.length()&&s.charAt(pos)=='}'){pos++;return map;}
        while(true){ws();require(pos<s.length()&&s.charAt(pos)=='"',"object key required");String key=string();want(':');
          require(!map.containsKey(key),"duplicate JSON key");map.put(key,value(depth+1));ws();char next=take();
          if(next=='}')break;require(next==',',"object separator");
        }return map;
      }
      if(c=='['){
        pos++;List<Object> list=new ArrayList<>();ws();if(pos<s.length()&&s.charAt(pos)==']'){pos++;return list;}
        while(true){list.add(value(depth+1));ws();char next=take();if(next==']')break;require(next==',',"array separator");}return list;
      }
      if(s.startsWith("true",pos)){pos+=4;return true;}
      if(s.startsWith("false",pos)){pos+=5;return false;}
      if(s.startsWith("null",pos)){pos+=4;return null;}
      int start=pos;
      if(c=='-'||Character.isDigit(c)){
        if(c=='-')pos++;require(pos<s.length(),"number missing");
        if(s.charAt(pos)=='0')pos++;else{require(s.charAt(pos)>='1'&&s.charAt(pos)<='9',"number syntax");
          while(pos<s.length()&&s.charAt(pos)>='0'&&s.charAt(pos)<='9')pos++;}
        require(pos==s.length()||" ,}]\r\n\t".indexOf(s.charAt(pos))>=0,"noninteger numeric form");
        try{return Integer.parseInt(s.substring(start,pos));}catch(NumberFormatException e){throw new IllegalArgumentException("HOLD: integer overflow");}
      }
      throw new IllegalArgumentException("HOLD: unrecognised JSON value");
    }
    String string(){want('"');StringBuilder b=new StringBuilder();
      while(true){char c=take();if(c=='"')return b.toString();
        if(c=='\\'){char e=take();switch(e){case '"':case '\\':case '/':b.append(e);break;
          case 'b':b.append('\b');break;case 'f':b.append('\f');break;
          case 'n':b.append('\n');break;case 'r':b.append('\r');break;case 't':b.append('\t');break;
          case 'u':require(pos+4<=s.length(),"short unicode escape");try{
            b.append((char)Integer.parseInt(s.substring(pos,pos+4),16));
          }catch(NumberFormatException ex){throw new IllegalArgumentException("HOLD: bad unicode escape");}pos+=4;break;
          default:throw new IllegalArgumentException("HOLD: bad escape");}
        }else {require(c>=32,"raw control character");b.append(c);}
      }
    }
  }
}
