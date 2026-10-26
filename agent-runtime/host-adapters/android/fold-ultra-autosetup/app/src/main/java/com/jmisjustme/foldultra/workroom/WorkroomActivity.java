package com.jmisjustme.foldultra.workroom;

import android.app.*;
import android.content.*;
import android.content.res.Configuration;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.provider.OpenableColumns;
import android.text.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import android.speech.tts.*;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
import org.json.*;
import com.jmisjustme.foldultra.ProjectShelf;
import com.jmisjustme.foldultra.SessionDeck;

/** CP05 native JM work environment. Sources stay local; no credentials or network. */
public final class WorkroomActivity extends Activity {
  static final int BG=0xff0a111e,PANEL=0xff16243a,INK=0xffedf4ff,FAINT=0xffa7bed7,ACCENT=0xff7fe0cc;
  static final int OPEN=701,EXPORT=702;
  WorkroomStore store;WorkroomStore.Doc doc;SharedPreferences sp;
  LinearLayout root,content;EditText editor;TextView status;boolean loading;
  Handler handler=new Handler(Looper.getMainLooper());Runnable pendingSave;
  String undo=null,pendingExport=null,pendingExportName=null,pendingExportId=null,screen="list";
  TextToSpeech speech;boolean speechReady;WebView preview;
  @Override public void onCreate(Bundle b){
    super.onCreate(b);sp=getSharedPreferences("jm.fold.ultra.prelaunch.v0.2",MODE_PRIVATE);
    if(!sp.getBoolean("ready",false)){finish();return;}
    store=new WorkroomStore(this);
    if(b!=null){
      pendingExportId=b.getString("exportId");pendingExportName=b.getString("exportName");
      if(pendingExportId!=null&&pendingExportId.matches("[a-f0-9-]{36}")){
        try{File f=new File(getCacheDir(),pendingExportId);if(f.length()>1048576)throw new IOException("Expired export");
          try(InputStream in=new FileInputStream(f);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);pendingExport=new String(out.toByteArray(),StandardCharsets.UTF_8);}
        }catch(Exception e){pendingExport=null;}
      }
    }
    getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
    getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    String id=sp.getString("workroom.active","");
    if(!id.isEmpty())try{doc=store.get(id);}catch(Exception ignored){}
    if(doc!=null)edit();else listing("");
  }
  int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
  TextView text(String value,int size,int color){TextView v=new TextView(this);v.setText(value);v.setTextSize(size);v.setTextColor(color);v.setPadding(0,dp(6),0,dp(6));return v;}
  LinearLayout column(){LinearLayout v=new LinearLayout(this);v.setOrientation(1);return v;}
  void button(LinearLayout p,String name,Runnable r){Button b=new Button(this);b.setText(name);b.setAllCaps(false);b.setTextColor(INK);b.setTextSize(14);b.setMinHeight(dp(48));p.addView(b,new LinearLayout.LayoutParams(-1,-2));b.setOnClickListener(v->run(r));}
  void run(Runnable r){try{r.run();}catch(Exception e){error(e);}}
  void error(Exception e){new AlertDialog.Builder(this).setTitle("JM · Action unfinished").setMessage(e.getMessage()==null?e.toString():e.getMessage()).setPositiveButton("OK",null).show();}
  void info(String title,String body){TextView v=text(body,15,INK);v.setTextIsSelectable(true);v.setPadding(dp(20),dp(8),dp(20),dp(8));ScrollView s=new ScrollView(this);s.addView(v);new AlertDialog.Builder(this).setTitle(title).setView(s).setPositiveButton("Close",null).show();}
  void base(String subtitle){
    editor=null;root=column();root.setBackgroundColor(BG);root.setPadding(dp(16),dp(10),dp(16),dp(8));
    root.setOnApplyWindowInsetsListener((v,i)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets safe=i.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(dp(16),safe.top+dp(8),dp(16),safe.bottom+dp(8));}return i;});
    TextView heading=text("JM WORKROOM",24,ACCENT);heading.setTypeface(null,Typeface.BOLD);root.addView(heading);
    root.addView(text(subtitle,13,FAINT));
    // Real 360dp phone surfaces need two readable touch columns; the
    // expanded Workfield retains four. Keep identical actions and order.
    controlGrid(root,new String[]{"Documents","New","Open file","Tools"},new Runnable[]{
      ()->{if(flush())listing("");},()->{if(flush())createDialog();},
      ()->{if(flush())openFile();},()->{if(flush())tools();}
    });
    content=column();root.addView(content,new LinearLayout.LayoutParams(-1,0,1));
    setContentView(root);
  }
  void controlGrid(LinearLayout target,String[] names,Runnable[] actions){
    if(names.length!=actions.length)throw new IllegalArgumentException("Control/action mismatch");
    int perRow=getResources().getConfiguration().screenWidthDp<500?2:4;
    for(int i=0;i<names.length;i+=perRow){
      LinearLayout row=new LinearLayout(this);
      target.addView(row,new LinearLayout.LayoutParams(-1,-2));
      for(int j=i;j<Math.min(i+perRow,names.length);j++){
        Button b=new Button(this);b.setText(names[j]);b.setTextSize(12);
        b.setAllCaps(false);b.setTextColor(INK);b.setMinHeight(dp(52));
        row.addView(b,new LinearLayout.LayoutParams(0,dp(52),1));
        Runnable action=actions[j];b.setOnClickListener(v->run(action));
      }
    }
  }
  EditText input(String hint,String value){EditText e=new EditText(this);e.setTextColor(INK);e.setHintTextColor(FAINT);e.setHint(hint);e.setTextSize(15);e.setText(value);return e;}
  interface Change {void changed(String value);}
  void watch(EditText e,Change change){e.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int before,int c){change.changed(s.toString());}public void afterTextChanged(Editable e){}});}
  LinearLayout scrolling(){ScrollView s=new ScrollView(this);LinearLayout c=column();s.addView(c);content.addView(s,new LinearLayout.LayoutParams(-1,0,1));return c;}
  String project(){return ProjectShelf.selected(sp);}
  void listing(String query){
    screen="list";base("Your documents · project-bound · local drafts and saved revisions");
    EditText search=input("Search document names and contents",query);search.setSingleLine(true);content.addView(search);
    LinearLayout list=scrolling();fillList(list,query);watch(search,q->fillList(list,q));
  }
  void fillList(LinearLayout list,String q){
    list.removeAllViews();List<WorkroomStore.Doc> docs=store.list(q);
    if(docs.isEmpty())list.addView(text("No documents here yet. Create a note, code file or message, or open a UTF-8 file.",16,FAINT));
    for(WorkroomStore.Doc d:docs){
      button(list,d.title+"\n"+d.project+" · r"+d.revision+(d.body.equals(d.saved)?" · saved":" · draft"),()->{doc=store.get(d.id);undo=null;sp.edit().putString("workroom.active",d.id).apply();edit();});
    }
    button(list,"Bring current JM session into a document",()->{
      try {JSONObject s=SessionDeck.find(sp,project());String value=SessionDeck.draftText(sp,s,"note");
        doc=store.create(project(),"JM session r"+s.getInt("revision")+".md",value);selected();
      }catch(Exception e){error(e);}
    });
    button(list,"Compose a message",()->compose());
    button(list,"Back to Fold Ultra",()->finish());
  }
  void selected(){sp.edit().putString("workroom.active",doc.id).apply();undo=null;edit();}
  void createDialog(){
    final String[] names={"Note / Markdown","HTML page","JSON data","JavaScript source","Email draft"};
    new AlertDialog.Builder(this).setTitle("Create in "+project()).setItems(names,(d,n)->{
      if(n==4){compose();return;}
      String[] titles={"Untitled.md","index.html","data.json","script.js"};
      String[] bodies={"","<!doctype html>\n<html><head><meta name=\"viewport\" content=\"width=device-width\"><title>JM creation</title></head>\n<body style=\"background:#101b2a;color:#7fe0cc;font:24px sans-serif;padding:24px\"><h1>JM creation</h1><button onclick=\"this.textContent='It works'\">Try me</button></body></html>","{\n  \"creator\": \"JM\",\n  \"ready\": true\n}\n","// JM source\nconsole.log('JM working');\n"};
      run(()->{doc=store.create(project(),titles[n],bodies[n]);selected();});
    }).setNegativeButton("Cancel",null).show();
  }
  void edit(){
    if(doc==null){listing("");return;}doc=store.get(doc.id);screen="edit";
    base(doc.title+" · "+doc.project+" · revision "+doc.revision);
    controlGrid(content,new String[]{"Save revision","Preview","Export","History"},new Runnable[]{
      ()->{if(flush()){doc=store.checkpoint(doc.id,doc.revision);status.setText("Saved revision "+doc.revision+" · "+WorkroomText.stats(doc.body));}},
      ()->{if(flush())preview(false);},()->{if(flush())export(doc.title,doc.body);},
      ()->{if(flush())history();}
    });
    status=text((doc.body.equals(doc.saved)?"Saved":"Local draft")+" · "+WorkroomText.stats(doc.body),12,FAINT);content.addView(status);
    editor=input("Write or paste your source here",doc.body);editor.setGravity(Gravity.TOP|Gravity.START);
    editor.setTypeface(Typeface.MONOSPACE);editor.setTextSize(getResources().getConfiguration().screenWidthDp>=600?17:15);
    editor.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
    editor.setFilters(new InputFilter[]{new InputFilter.LengthFilter(WorkroomText.MAX_TEXT)});
    content.addView(editor,new LinearLayout.LayoutParams(-1,0,1));
    watch(editor,value->{if(loading)return;status.setText("Saving draft… · "+WorkroomText.stats(value));
      if(pendingSave!=null)handler.removeCallbacks(pendingSave);
      pendingSave=()->flush();handler.postDelayed(pendingSave,350);
    });
    button(content,"Name · Find · Format · Read · Compare",()->{if(flush())tools();});
  }
  boolean flush(){
    if(pendingSave!=null){handler.removeCallbacks(pendingSave);pendingSave=null;}
    if(doc==null||editor==null)return true;
    try{String value=editor.getText().toString();if(!value.equals(doc.body)){store.draft(doc.id,doc.revision,doc.title,value);doc=store.get(doc.id);}
      if(status!=null)status.setText((doc.body.equals(doc.saved)?"Saved":"Draft saved locally")+" · "+WorkroomText.stats(value));return true;
    }catch(Exception e){error(e);return false;}
  }
  void replaceBody(String value){WorkroomText.checked(value);undo=doc.body;store.draft(doc.id,doc.revision,doc.title,value);doc=store.get(doc.id);edit();}
  void tools(){
    screen="tools";base(doc==null?"Choose a document for text and code tools":doc.title+" · tools run locally");
    LinearLayout c=scrolling();
    if(doc==null){button(c,"New document",()->createDialog());return;}
    button(c,"Return to editor",()->edit());
    button(c,"Rename document",()->{EditText name=input("Name",doc.title);new AlertDialog.Builder(this).setTitle("Document name").setView(name).setNegativeButton("Cancel",null).setPositiveButton("Rename",(d,w)->run(()->{store.draft(doc.id,doc.revision,name.getText().toString(),doc.body);doc=store.get(doc.id);edit();})).show();});
    button(c,"Find and replace literal text",()->findReplace());
    button(c,"Format / validate JSON",()->{
      try{JSONTokener t=new JSONTokener(doc.body);Object o=t.nextValue();if(t.nextClean()!=0)throw new IllegalArgumentException("Extra content after JSON value");
        if(o instanceof JSONObject)replaceBody(((JSONObject)o).toString(2));else if(o instanceof JSONArray)replaceBody(((JSONArray)o).toString(2));else throw new IllegalArgumentException("Use a JSON object or array");
      }catch(Exception e){error(e);}
    });
    button(c,"Undo last tool edit",()->{if(undo==null)throw new IllegalStateException("No tool edit to undo in this session");String old=undo;undo=null;store.draft(doc.id,doc.revision,doc.title,old);doc=store.get(doc.id);edit();});
    button(c,"Compare with saved revision",()->info("Changes · line positions",WorkroomText.changes(doc.saved,doc.body)));
    button(c,"Read aloud · installed offline voice",()->readAloud());
    button(c,"Stop reading",()->{if(speech!=null)speech.stop();});
    button(c,"Run offline HTML / JavaScript preview",()->new AlertDialog.Builder(this).setTitle("Run this document?").setMessage("Runs the document's JavaScript in a separate WebView. Network, local file access and native bridges are disabled. Untrusted scripts can still hang their preview; run only source you choose to execute.").setNegativeButton("Cancel",null).setPositiveButton("Run preview",(d,w)->preview(true)).show());
    button(c,"Document integrity / SHA-256",()->info("UTF-8 text integrity",WorkroomText.stats(doc.body)+"\n\nSHA-256\n"+WorkroomText.sha256(doc.body)));
    button(c,"Stage a copy in current JM project session",()->stageSession());
    button(c,"Compose message from this document",()->compose());
    button(c,"Retire this local document",()->new AlertDialog.Builder(this).setTitle("Retire "+doc.title+"?").setMessage("Removes this Workroom document and its retained revisions. Export first if you need a separate copy. JM project sessions are independent.").setNegativeButton("Keep",null).setPositiveButton("Retire document",(d,w)->{store.remove(doc.id);doc=null;undo=null;sp.edit().remove("workroom.active").apply();listing("");}).show());
  }
  void findReplace(){
    LinearLayout c=column();EditText find=input("Find (case sensitive)",""),with=input("Replace with","");c.addView(find);c.addView(with);
    final String expected=doc.body,id=doc.id;final int rev=doc.revision;
    new AlertDialog.Builder(this).setTitle("Find and replace").setView(c).setNegativeButton("Cancel",null).setPositiveButton("Review",(d,w)->run(()->{
      String proposed=WorkroomText.replace(expected,find.getText().toString(),with.getText().toString());
      infoReplace(id,rev,expected,proposed);
    })).show();
  }
  void infoReplace(String id,int rev,String expected,String proposed){
    new AlertDialog.Builder(this).setTitle("Apply replacement?").setMessage(WorkroomText.changes(expected,proposed)).setNegativeButton("Cancel",null).setPositiveButton("Apply",(d,w)->run(()->{
      WorkroomStore.Doc now=store.get(id);if(now.revision!=rev||!now.body.equals(expected))throw new IllegalStateException("Document changed since preview");replaceBody(proposed);
    })).show();
  }
  void history(){
    List<Integer> revs=store.history(doc.id);if(revs.isEmpty()){info("History","Save a revision first. Up to 32 revisions per document are retained locally.");return;}
    String[] labels=new String[revs.size()];for(int i=0;i<labels.length;i++)labels[i]="Revision "+revs.get(i);
    new AlertDialog.Builder(this).setTitle("Recover a revision as a draft").setItems(labels,(d,n)->{
      final String recovered=store.revision(doc.id,revs.get(n));
      new AlertDialog.Builder(this).setTitle("Revision "+revs.get(n)).setMessage(WorkroomText.changes(doc.body,recovered)).setNegativeButton("Keep current",null).setPositiveButton("Recover as draft",(a,b)->run(()->replaceBody(recovered))).show();
    }).setNegativeButton("Close",null).show();
  }
  void preview(boolean execute){
    if(doc==null)return;
    WebView web=new WebView(this);preview=web;WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(execute);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setDomStorageEnabled(false);s.setDatabaseEnabled(false);s.setBlockNetworkLoads(true);s.setSupportMultipleWindows(false);s.setMediaPlaybackRequiresUserGesture(true);
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){return true;}
      @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
    });
    String csp="<meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src "+(execute?"'unsafe-inline'":"'none'")+"; connect-src 'none'; form-action 'none'; base-uri 'none'\">";
    String html=execute?doc.body:WorkroomText.readingHtml(doc.body);
    web.loadDataWithBaseURL(null,csp+html,"text/html","UTF-8",null);
    AlertDialog dialog=new AlertDialog.Builder(this).setTitle(execute?"JM · Offline runtime preview":"JM · Reading preview").setView(web).setPositiveButton("Close",null).create();
    dialog.setOnDismissListener(d->{web.stopLoading();web.destroy();if(preview==web)preview=null;});dialog.show();dialog.getWindow().setLayout(-1,(int)(getResources().getDisplayMetrics().heightPixels*.85));
  }
  void openFile(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"text/*","application/json","application/javascript","message/rfc822"});try{startActivityForResult(i,OPEN);}catch(Exception e){error(e);}}
  void export(String name,String body){
    pendingExport=body;pendingExportName=WorkroomText.filename(name);pendingExportId=UUID.randomUUID().toString();
    try(FileOutputStream out=new FileOutputStream(new File(getCacheDir(),pendingExportId))){out.write(body.getBytes(StandardCharsets.UTF_8));}
    catch(Exception e){pendingExport=null;error(e);return;}
    Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("text/plain");i.putExtra(Intent.EXTRA_TITLE,pendingExportName);
    try{startActivityForResult(i,EXPORT);}catch(Exception e){pendingExport=null;error(e);}
  }
  @Override protected void onSaveInstanceState(Bundle b){if(flush()){b.putString("exportId",pendingExportId);b.putString("exportName",pendingExportName);}super.onSaveInstanceState(b);}
  @Override protected void onActivityResult(int req,int result,Intent data){
    super.onActivityResult(req,result,data);if(result!=RESULT_OK||data==null||data.getData()==null){clearExport();return;}
    Uri uri=data.getData();
    try{
      if(req==OPEN){
        byte[] bytes;try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
          if(in==null)throw new IOException("Source unavailable");byte[] buffer=new byte[8192];int n,total=0;
          while((n=in.read(buffer))!=-1){total+=n;if(total>1048576)throw new IOException("Text import is limited to 1 MiB");out.write(buffer,0,n);}bytes=out.toByteArray();
        }
        String value=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
        if(value.startsWith("\ufeff"))value=value.substring(1);WorkroomText.checked(value);
        String name="Imported.txt";try(android.database.Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst()&&c.getString(0)!=null)name=WorkroomText.filename(c.getString(0));}
        final String imported=value,title=name,project=project();
        new AlertDialog.Builder(this).setTitle("Import "+title+"?").setMessage(WorkroomText.stats(value)+"\n\nCreates a local document in "+project+". The original file is unchanged.").setNegativeButton("Cancel",null).setPositiveButton("Import document",(d,w)->run(()->{if(!flush())return;doc=store.create(project,title,imported);selected();})).show();
      }else if(req==EXPORT){
        String value=pendingExport;clearExport();if(value==null)throw new IOException("Export expired; choose Export again");
        byte[] bytes=value.getBytes(StandardCharsets.UTF_8);
        try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException("Export destination unavailable");out.write(bytes);}
        try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
          if(in==null)throw new IOException("Written; destination readback unavailable");byte[] b=new byte[8192];int n,total=0;while((n=in.read(b))!=-1){total+=n;if(total>1048576)throw new IOException("Export readback exceeds bound");out.write(b,0,n);}if(!Arrays.equals(bytes,out.toByteArray()))throw new IOException("Export byte comparison failed");
        }
        info("Export verified",pendingExportName+"\n"+bytes.length+" UTF-8 bytes\nSHA-256 "+WorkroomText.sha256(value));
      }
    }catch(Exception e){error(e);}
  }
  void clearExport(){pendingExport=null;if(pendingExportId!=null&&pendingExportId.matches("[a-f0-9-]{36}"))new File(getCacheDir(),pendingExportId).delete();pendingExportId=null;}
  void compose(){
    LinearLayout c=column();EditText to=input("Recipient email",""),subject=input("Subject",""),body=input("Message",doc==null?"":doc.body);to.setSingleLine(true);subject.setSingleLine(true);body.setMinLines(4);body.setMaxLines(8);body.setFilters(new InputFilter[]{new InputFilter.LengthFilter(100000)});c.addView(to);c.addView(subject);c.addView(body);ScrollView sc=new ScrollView(this);sc.addView(c);
    new AlertDialog.Builder(this).setTitle("JM message · saved locally").setView(sc).setNegativeButton("Cancel",null).setPositiveButton("Create .eml draft",(d,w)->run(()->{
      String value=WorkroomText.message(to.getText().toString(),subject.getText().toString(),body.getText().toString());
      doc=store.create(project(),"Message.eml",value);selected();
    })).show();
  }
  void stageSession(){
    try{
      final String id=project();final JSONObject checkpoint=SessionDeck.find(sp,id);final int revision=checkpoint.getInt("revision");
      final String before=SessionDeck.draftText(sp,checkpoint,"note"),source=doc.body;
      final String next=before.isEmpty()?source:before+"\n\n"+source;
      if(next.length()>4000)throw new IllegalArgumentException("JM session notes hold up to 4,000 characters; select a smaller document or keep this source in Workroom");
      new AlertDialog.Builder(this).setTitle("Append to "+id+" session draft?").setMessage(next).setNegativeButton("Cancel",null).setPositiveButton("Append draft",(d,w)->{
        try{JSONObject now=SessionDeck.find(sp,id);if(!project().equals(id)||now.getInt("revision")!=revision||!SessionDeck.draftText(sp,now,"note").equals(before))throw new IllegalStateException("JM session changed since preview");
          SessionDeck.draft(sp,id,"note",next);info("JM draft updated","Source appended to your existing session draft. Save its checkpoint in Fold Ultra when ready.");
        }catch(Exception e){error(e);}
      }).show();
    }catch(Exception e){error(e);}
  }
  void readAloud(){
    if(doc==null||doc.body.isEmpty())return;
    if(speech==null){speech=new TextToSpeech(this,result->{speechReady=result==TextToSpeech.SUCCESS;if(speechReady)run(()->speak());else info("Voice unavailable","Install an offline Android text-to-speech voice, then try again.");});}
    else if(speechReady)speak();else info("Voice starting","Try Read aloud again after the voice engine starts.");
  }
  void speak(){
    if(speech==null||!speechReady||doc==null)return;
    Set<Voice> voices=speech.getVoices();Voice choice=null;
    if(voices!=null)for(Voice voice:voices)if(!voice.isNetworkConnectionRequired()&&voice.getLocale().getLanguage().equals(Locale.getDefault().getLanguage())){choice=voice;break;}
    if(choice==null){info("Offline voice needed","No installed offline voice for your device language was reported. No text was queued.");return;}
    if(speech.setVoice(choice)==TextToSpeech.ERROR){info("Voice unavailable","The installed engine refused this offline voice.");return;}
    speech.stop();String value=doc.body;int chunk=Math.min(3000,TextToSpeech.getMaxSpeechInputLength());
    for(int i=0;i<value.length();i+=chunk){int end=Math.min(value.length(),i+chunk);if(speech.speak(value.substring(i,end),TextToSpeech.QUEUE_ADD,null,"jm-"+i)==TextToSpeech.ERROR){info("Reading unfinished","The speech engine refused a text segment.");break;}}
  }
  @Override protected void onPause(){flush();if(speech!=null)speech.stop();super.onPause();}
  @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);if(speech!=null)speech.shutdown();if(preview!=null){preview.destroy();preview=null;}if(store!=null)store.close();super.onDestroy();}
  @Override public void onBackPressed(){if(!flush())return;if(!screen.equals("list")){listing("");return;}super.onBackPressed();}
}
