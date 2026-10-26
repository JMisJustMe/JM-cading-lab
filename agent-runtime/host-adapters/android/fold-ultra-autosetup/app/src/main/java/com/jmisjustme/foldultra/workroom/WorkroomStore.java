package com.jmisjustme.foldultra.workroom;

import android.content.*;
import android.database.Cursor;
import android.database.sqlite.*;
import java.util.*;

/** Independent JM document body; project IDs belong to inherited ProjectShelf.
 * Drafts and commits are distinct. SQLite transactions guard revision writes. */
public final class WorkroomStore extends SQLiteOpenHelper {
  public static final int MAX_DOCS=128,MAX_HISTORY=32;
  public static final class Doc {
    public String id,project,title,body,saved;public int revision;public long updated;
    static Doc read(Cursor c){Doc d=new Doc();d.id=c.getString(0);d.project=c.getString(1);d.title=c.getString(2);
      d.body=c.getString(3);d.saved=c.getString(4);d.revision=c.getInt(5);d.updated=c.getLong(6);return d;}
  }
  public WorkroomStore(Context c){super(c,"jm-workroom-cp05.db",null,1);}
  @Override public void onConfigure(SQLiteDatabase db){db.setForeignKeyConstraintsEnabled(true);}
  @Override public void onCreate(SQLiteDatabase db){
    db.execSQL("CREATE TABLE documents(id TEXT PRIMARY KEY,project TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,saved TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL)");
    db.execSQL("CREATE TABLE revisions(doc TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,revision INTEGER NOT NULL,body TEXT NOT NULL,stamp INTEGER NOT NULL,PRIMARY KEY(doc,revision))");
    db.execSQL("CREATE INDEX project_docs ON documents(project,updated)");
  }
  @Override public void onUpgrade(SQLiteDatabase db,int a,int b){throw new IllegalStateException("Unknown JM document schema; preserve original database");}
  public Doc get(String id){
    try(Cursor c=getReadableDatabase().query("documents",null,"id=?",new String[]{id},null,null,null)){
      if(!c.moveToFirst())throw new IllegalArgumentException("Document is unavailable");return Doc.read(c);
    }
  }
  public List<Doc> list(String query){
    String q=query==null?"":query;List<Doc> result=new ArrayList<>();
    // Bound parameter + instr = literal case-insensitive search, not SQL wildcards.
    try(Cursor c=getReadableDatabase().rawQuery("SELECT id,project,title,CASE WHEN body=saved THEN '' ELSE 'draft' END,'',revision,updated FROM documents WHERE instr(lower(title),lower(?))>0 OR instr(lower(body),lower(?))>0 ORDER BY updated DESC LIMIT 128",new String[]{q,q})){
      while(c.moveToNext())result.add(Doc.read(c));
    }return result;
  }
  public Doc create(String project,String title,String body){
    WorkroomText.checked(body);title=validTitle(title);
    if(project==null||!project.matches("[a-z0-9][a-z0-9-]{1,31}"))throw new IllegalArgumentException("Invalid JM project binding");
    SQLiteDatabase db=getWritableDatabase();String id=UUID.randomUUID().toString();db.beginTransaction();
    try{
      try(Cursor c=db.rawQuery("SELECT count(*) FROM documents",null)){c.moveToFirst();if(c.getInt(0)>=MAX_DOCS)throw new IllegalStateException("128 document limit; export and retire unused documents first");}
      ContentValues v=new ContentValues();v.put("id",id);v.put("project",project);v.put("title",title);v.put("body",body);v.put("saved","");v.put("revision",0);v.put("updated",System.currentTimeMillis());
      db.insertOrThrow("documents",null,v);db.setTransactionSuccessful();
    }finally{db.endTransaction();}return get(id);
  }
  private static String validTitle(String s){if(s==null||s.trim().isEmpty()||s.length()>96||s.contains("\n")||s.contains("\r"))throw new IllegalArgumentException("Use a one-line name up to 96 characters");return s.trim();}
  public void draft(String id,int expected,String title,String body){
    WorkroomText.checked(body);ContentValues v=new ContentValues();v.put("title",validTitle(title));v.put("body",body);v.put("updated",System.currentTimeMillis());
    if(getWritableDatabase().update("documents",v,"id=? AND revision=?",new String[]{id,""+expected})!=1)
      throw new IllegalStateException("Revision changed; reopen this document before editing");
  }
  public Doc checkpoint(String id,int expected){
    SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
    try{Doc d=get(id);if(d.revision!=expected)throw new IllegalStateException("Revision conflict; original preserved");
      if(d.revision>0&&d.body.equals(d.saved)){db.setTransactionSuccessful();return d;}
      int revision=d.revision+1;ContentValues r=new ContentValues();r.put("doc",id);r.put("revision",revision);r.put("body",d.body);r.put("stamp",System.currentTimeMillis());db.insertOrThrow("revisions",null,r);
      ContentValues v=new ContentValues();v.put("revision",revision);v.put("saved",d.body);db.update("documents",v,"id=? AND revision=?",new String[]{id,""+expected});
      db.execSQL("DELETE FROM revisions WHERE doc=? AND revision<=?",new Object[]{id,revision-MAX_HISTORY});db.setTransactionSuccessful();
    }finally{db.endTransaction();}return get(id);
  }
  public List<Integer> history(String id){List<Integer> out=new ArrayList<>();try(Cursor c=getReadableDatabase().rawQuery("SELECT revision FROM revisions WHERE doc=? ORDER BY revision DESC",new String[]{id})){while(c.moveToNext())out.add(c.getInt(0));}return out;}
  public String revision(String id,int rev){try(Cursor c=getReadableDatabase().rawQuery("SELECT body FROM revisions WHERE doc=? AND revision=?",new String[]{id,""+rev})){if(!c.moveToFirst())throw new IllegalArgumentException("Revision is unavailable");return c.getString(0);}}
  public void remove(String id){getWritableDatabase().delete("documents","id=?",new String[]{id});}
}
