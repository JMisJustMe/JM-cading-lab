package com.jmisjustme.foldultra;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Independent JM original structure organ. Deterministic, offline, provider-free.
 * The generic, lawful primitives here are bytes, lines, words, headings, task
 * markers, content digests and sequence diff. This is NOT an AI-model substitute.
 * Owns no credentials, Android permissions, external network or project authority.
 */
public final class JMOriginalStructures {
  public static final String SCHEMA="JM.OriginalStructures/0.1";
  public static final int MAX_CHARS=10000,MAX_DIFF_LINES=160;
  private static final Pattern WORD=Pattern.compile("[\\p{L}\\p{N}]+");
  private static final Pattern HEADER=Pattern.compile("^#{1,6}[ \\t]+(.+)$");
  private static final Pattern TASK=Pattern.compile("^\\s*(?:[-*][ \\t]+)?(?:\\[ \\]|TODO:?)[ \\t]*(.+)$",Pattern.CASE_INSENSITIVE);
  private static final Pattern HTTPS=Pattern.compile("https://[^\\s<>()]+");
  private JMOriginalStructures(){}
  public static String checked(String text){
    if(text==null || text.length()>MAX_CHARS || text.indexOf('\u0000')>=0)
      throw new IllegalArgumentException("JM structure source must be 0–10,000 chars without NUL");
    return text;
  }
  public static String sha256(String text){
    checked(text);
    try{
      byte[] bytes=MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
      StringBuilder b=new StringBuilder();
      for(byte x:bytes)b.append(String.format(Locale.ROOT,"%02x",x & 255));
      return b.toString();
    }catch(Exception e){throw new IllegalStateException("SHA-256 unavailable",e);}
  }
  public static final class Analysis{
    public final int chars,bytes,lines,words,unique,headings,tasks,httpsLinks;
    public final String hash,outline,todo;
    private Analysis(int c,int b,int l,int w,int u,int h,int t,int links,String digest,String o,String work){
      chars=c;bytes=b;lines=l;words=w;unique=u;headings=h;tasks=t;httpsLinks=links;hash=digest;outline=o;todo=work;
    }
    public String report(){
      return "JM ORIGINAL STRUCTURES · LOCAL\nSHA-256 "+hash+
          "\nCharacters "+chars+" · UTF-8 bytes "+bytes+" · lines "+lines+
          "\nWords "+words+" · distinct "+unique+" · headings "+headings+
          " · open tasks "+tasks+" · HTTPS references "+httpsLinks+
          "\n\nSTRUCTURE\n"+outline+"\n\nOPEN WORK\n"+todo;
    }
  }
  public static Analysis inspect(String source){
    String s=checked(source);
    String[] lines=s.isEmpty()?new String[0]:s.split("\n",-1);
    Matcher words=WORD.matcher(s);
    Set<String> unique=new HashSet<>();
    int count=0;while(words.find()){count++;unique.add(words.group().toLowerCase(Locale.ROOT));}
    int headings=0,tasks=0,links=0;
    StringBuilder outline=new StringBuilder(),todo=new StringBuilder();
    for(String line:lines){
      Matcher h=HEADER.matcher(line);
      if(h.matches()){
        headings++;
        if(outline.length()<2500)outline.append("• ").append(h.group(1).trim()).append('\n');
      }
      Matcher t=TASK.matcher(line);
      if(t.matches()){
        tasks++;
        if(todo.length()<2500)todo.append("☐ ").append(t.group(1).trim()).append('\n');
      }
      Matcher link=HTTPS.matcher(line);
      while(link.find())links++;
    }
    return new Analysis(s.length(),s.getBytes(StandardCharsets.UTF_8).length,lines.length,
        count,unique.size(),headings,tasks,links,sha256(s),
        outline.length()==0?"(No Markdown headings)":outline.toString().trim(),
        todo.length()==0?"(No open task markers)":todo.toString().trim());
  }
  public static final class Difference{
    public final int added,removed,unchanged;
    public final String beforeHash,afterHash,patch;
    private Difference(int a,int r,int same,String b,String c,String text){
      added=a;removed=r;unchanged=same;beforeHash=b;afterHash=c;patch=text;
    }
    public String report(){
      return "JM EXACT LINE COMPARISON\nAdded "+added+" · removed "+removed+" · unchanged "+unchanged+
          "\nBEFORE "+beforeHash+"\nAFTER  "+afterHash+"\n\n"+patch;
    }
  }
  public static Difference compare(String before,String after){
    String a=checked(before),b=checked(after);
    String[] x=a.isEmpty()?new String[0]:a.split("\n",-1);
    String[] y=b.isEmpty()?new String[0]:b.split("\n",-1);
    if(x.length>MAX_DIFF_LINES||y.length>MAX_DIFF_LINES)
      throw new IllegalArgumentException("Exact diff HOLD: more than 160 lines; preserve source and split the comparison");
    int[][] lcs=new int[x.length+1][y.length+1];
    for(int i=x.length-1;i>=0;i--)
      for(int j=y.length-1;j>=0;j--)
        lcs[i][j]=x[i].equals(y[j])?1+lcs[i+1][j+1]:Math.max(lcs[i+1][j],lcs[i][j+1]);
    int i=0,j=0,add=0,remove=0,same=0;
    StringBuilder patch=new StringBuilder();
    while(i<x.length||j<y.length){
      char kind;String line;
      if(i<x.length&&j<y.length&&x[i].equals(y[j])){
        kind=' ';line=x[i++];j++;same++;
      }else if(j<y.length&&(i==x.length||lcs[i][j+1]>=lcs[i+1][j])){
        kind='+';line=y[j++];add++;
      }else{kind='-';line=x[i++];remove++;}
      if(patch.length()<6000)patch.append(kind).append(' ').append(line).append('\n');
    }
    if(patch.length()>6000)patch.setLength(6000);
    return new Difference(add,remove,same,sha256(a),sha256(b),
        patch.length()==0?"(Both sources empty)":patch.toString());
  }
}
