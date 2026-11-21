package com.jmisjustme.foldultra;

/**
 * Real JVM execution of the unchanged production structure organ.
 * No mock API, DOM, GitHub search result or LLM claims.
 * Compile with the production .java and execute with JDK 17.
 */
public final class JMOriginalStructuresProof{
  static int count=0;
  static void yes(String name,boolean condition){
    if(!condition)throw new AssertionError("FAIL "+name);
    ++count;System.out.println("PASS "+count+" "+name);
  }
  static void refused(String name,Runnable operation){
    boolean held=false;
    try{operation.run();}catch(IllegalArgumentException e){held=true;}
    yes(name,held);
  }
  public static void main(String[] args){
    JMOriginalStructures.Analysis empty=JMOriginalStructures.inspect("");
    yes("schema",JMOriginalStructures.SCHEMA.equals("JM.OriginalStructures/0.1"));
    yes("max bound",JMOriginalStructures.MAX_CHARS==10000);
    yes("empty chars",empty.chars==0);
    yes("empty bytes",empty.bytes==0);
    yes("empty line count",empty.lines==0);
    yes("empty words",empty.words==0);
    yes("empty distinct",empty.unique==0);
    yes("empty headings",empty.headings==0);
    yes("empty tasks",empty.tasks==0);
    yes("empty references",empty.httpsLinks==0);
    yes("empty SHA256",empty.hash.equals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));
    refused("null source refused",()->JMOriginalStructures.inspect(null));
    refused("length 10001 refused",()->JMOriginalStructures.inspect("a".repeat(10001)));
    refused("embedded NUL refused",()->JMOriginalStructures.inspect("A\0B"));
    yes("maximum valid length",JMOriginalStructures.inspect("a".repeat(10000)).chars==10000);
    yes("single-line semantics",JMOriginalStructures.inspect("A").lines==1);
    yes("two lines",JMOriginalStructures.inspect("A\nB").lines==2);
    yes("trailing newline preserved",JMOriginalStructures.inspect("A\n").lines==2);
    yes("source bytes preserved",JMOriginalStructures.inspect("A\r\nB").bytes==4);
    yes("UTF8 distinct bytes",JMOriginalStructures.inspect("🌎").bytes==4);
    yes("unicode word",JMOriginalStructures.inspect("café café").words==2);
    yes("case folding distinct",JMOriginalStructures.inspect("Hello hello HELLO").unique==1);
    yes("punctuation splits",JMOriginalStructures.inspect("one,two. three!").words==3);
    JMOriginalStructures.Analysis text=JMOriginalStructures.inspect("# Title\n## Child\n- [ ] Action\nTODO: More\n- [x] Complete\nhttps://example.org");
    yes("markdown headings",text.headings==2);
    yes("outline preserved",text.outline.contains("Title")&&text.outline.contains("Child"));
    yes("open markdown task",text.todo.contains("Action"));
    yes("open TODO task",text.todo.contains("More"));
    yes("finished task excluded",!text.todo.contains("Complete"));
    yes("task count",text.tasks==2);
    yes("HTTPS link counted",text.httpsLinks==1);
    yes("HTTP not HTTPS",JMOriginalStructures.inspect("http://example.org").httpsLinks==0);
    yes("fake heading ignored",JMOriginalStructures.inspect("Not # a heading").headings==0);
    yes("report includes actual digest",text.report().contains(text.hash));
    JMOriginalStructures.Difference identical=JMOriginalStructures.compare("A\nB","A\nB");
    yes("exact diff unchanged",identical.unchanged==2&&identical.added==0&&identical.removed==0);
    JMOriginalStructures.Difference added=JMOriginalStructures.compare("A","A\nB");
    yes("exact diff addition",added.added==1&&added.removed==0);
    yes("addition patch",added.patch.contains("+ B"));
    JMOriginalStructures.Difference removed=JMOriginalStructures.compare("A\nB","B");
    yes("exact diff deletion",removed.removed==1&&removed.added==0);
    yes("deletion patch",removed.patch.contains("- A"));
    JMOriginalStructures.Difference replacement=JMOriginalStructures.compare("old","new");
    yes("replacement counted both ways",replacement.added==1&&replacement.removed==1);
    yes("comparison digest changes",!replacement.beforeHash.equals(replacement.afterHash));
    yes("no-change digest equality",identical.beforeHash.equals(identical.afterHash));
    yes("empty comparison",JMOriginalStructures.compare("","").patch.contains("empty"));
    refused("diff line bound enforced",()->JMOriginalStructures.compare("X\n".repeat(161),"Y"));
    yes("diff reorder LCS",JMOriginalStructures.compare("A\nB\nC","B\nA\nC").unchanged==2);
    yes("text intact after analysis",JMOriginalStructures.checked("# raw\n") .equals("# raw\n"));
    yes("no fabricated AI result",!text.report().toLowerCase().contains("model generated"));
    yes("headings not counted mid-line",JMOriginalStructures.inspect("prefix # text").headings==0);
    yes("unicode source digest length",JMOriginalStructures.sha256("猫").length()==64);
    yes("two links count",JMOriginalStructures.inspect("https://a.org https://b.org").httpsLinks==2);
    if(count!=49)throw new AssertionError("Expected 49 independent checks, actually "+count);
    System.out.println("JM ORIGINAL STRUCTURES · "+count+"/"+count+" REAL JVM CHECKS PASS");
  }
}
