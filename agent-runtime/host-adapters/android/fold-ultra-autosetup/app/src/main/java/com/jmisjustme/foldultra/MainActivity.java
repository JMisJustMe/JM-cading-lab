package com.jmisjustme.foldultra;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Bundle;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String PREFS = "jm.fold.ultra.root.v0.1";
    private static final String SCHEMA = "JM.FoldUltraRoot/0.1";
    private static final int EXPORT = 101, IMPORT = 102;
    private final int bg = Color.rgb(10,14,26), panel = Color.rgb(24,31,51);
    private final int white = Color.rgb(236,244,255), faded = Color.rgb(165,186,217);
    private LinearLayout body;
    private EditText rootNote;
    private boolean editing = false;
    private int lastWidth = -1;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        draw();
    }

    @Override protected void onResume() {
        super.onResume();
        int w = getResources().getConfiguration().screenWidthDp;
        if (w != lastWidth) draw();
    }

    @Override public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        draw();
    }

    private TextView text(String s, int size, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(s); v.setTextColor(color); v.setTextSize(size);
        if (bold) v.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        v.setPadding(0, 7, 0, 7);
        return v;
    }
    private void add(String s, int size, int color, boolean bold) {
        body.addView(text(s,size,color,bold));
    }
    private void action(String label, Runnable r) {
        Button b = new Button(this);
        b.setAllCaps(false); b.setText(label); b.setTextColor(white);
        b.setTextSize(16);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(panel));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2);
        p.setMargins(0,7,0,7);
        body.addView(b,p); b.setOnClickListener(v -> r.run());
    }
    private void draw() {
        int dp = getResources().getConfiguration().screenWidthDp;
        lastWidth=dp;
        boolean unfolded = dp>=600;
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(bg);
        body=new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        int side=(int)(20*getResources().getDisplayMetrics().density);
        body.setPadding(side,side,side,side*2);
        scroll.addView(body);
        setContentView(scroll);

        add("JM // FOLD ULTRA", 25, white, true);
        add("v0.1  ·  PAIRED ROOT  ·  "+(unfolded?"WORKFIELD":"SOURCE"),15,unfolded?0xffbea8ff:0xff83b9ff,true);
        add("Display class: "+dp+" dp   |   Native Android companion",13,faded,false);
        add("SOURCE → SIGNAL → CONTACT FIELD → ROUTE → DING → TRACE → RECOVERY → OUTPUT",12,faded,false);
        add("Shared root note (saved locally on this phone)",14,white,true);
        rootNote=new EditText(this);
        rootNote.setTextColor(white); rootNote.setHintTextColor(faded);
        rootNote.setHint("Your JM working root");
        rootNote.setTextSize(15);
        rootNote.setMinLines(2);
        rootNote.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff83b9ff));
        rootNote.setText(getPreferences(0).getString("root","JM FOLD ULTRA · ROOT v0.1"));
        body.addView(rootNote);
        rootNote.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s,int st,int count,int after){}
            public void onTextChanged(CharSequence s,int st,int before,int count){
                if (!editing) getPreferences(0).edit().putString("root",s.toString()).apply();
            }
            public void afterTextChanged(Editable e){}
        });

        if (unfolded) {
            add("WORKFIELD · create / test / recover",19,white,true);
            action("JM Ecostate — live house",()->url("https://jmisjustme.github.io/JM-cading-lab/"));
            action("JM Games — playable house",()->url("https://jmisjustme.github.io/JM-cading-lab/games-beyond/"));
            action("GitHub — source spine",()->url("https://github.com/JMisJustMe/JM-cading-lab"));
            action("Open files",()->launch("com.sec.android.app.myfiles"));
            action("Samsung Notes",()->launch("com.samsung.android.app.notes"));
            action("ChatGPT",()->launch("com.openai.chatgpt"));
        } else {
            add("SOURCE · quick access / capture",19,white,true);
            action("Open files",()->launch("com.sec.android.app.myfiles"));
            action("Samsung Notes",()->launch("com.samsung.android.app.notes"));
            action("ChatGPT",()->launch("com.openai.chatgpt"));
            action("JM Ecostate",()->url("https://jmisjustme.github.io/JM-cading-lab/"));
            action("Phone dialler",()->safe(new Intent(Intent.ACTION_DIAL)));
        }
        add("CONTROL · authorised actions",19,white,true);
        action("Pin JM root shortcut (Android approval)",this::pin);
        action("Export root configuration (.json)",()->document(true));
        action("Import root configuration (.json)",()->document(false));
        action("Open Android settings",()->safe(new Intent(Settings.ACTION_SETTINGS)));
        action("What this version can / cannot automate",this::limits);
        add("CARRIER: SOURCE READY  ·  APK BUILD: VERIFY IN CI  ·  FOLD DEVICE DING: OPEN",12,faded,false);
        add("No root · no Accessibility Service · no device administrator · no storage permission · no launcher replacement",12,faded,false);
    }

    private void launch(String pkg) {
        Intent i=getPackageManager().getLaunchIntentForPackage(pkg);
        if(i==null){Toast.makeText(this,"App unavailable or not visible: "+pkg,Toast.LENGTH_LONG).show();return;}
        safe(i);
    }
    private void safe(Intent i) {
        try { startActivity(i); }
        catch (Exception e) { Toast.makeText(this,"Android cannot open this route",Toast.LENGTH_LONG).show(); }
    }
    private void url(String uri) { safe(new Intent(Intent.ACTION_VIEW,Uri.parse(uri))); }
    private void pin() {
        ShortcutManager manager=getSystemService(ShortcutManager.class);
        if(manager==null || !manager.isRequestPinShortcutSupported()) {
            Toast.makeText(this,"Home shortcut pinning unsupported by launcher",Toast.LENGTH_LONG).show();return;
        }
        Intent to=new Intent(this,MainActivity.class).setAction(Intent.ACTION_MAIN);
        ShortcutInfo shortcut=new ShortcutInfo.Builder(this,"jm-fold-root")
            .setShortLabel("JM Root").setLongLabel("JM Fold Ultra · Paired Root")
            .setIcon(Icon.createWithResource(this,android.R.drawable.ic_menu_manage))
            .setIntent(to).build();
        if (!manager.requestPinShortcut(shortcut,null))
            Toast.makeText(this,"Launcher declined shortcut request",Toast.LENGTH_LONG).show();
    }
    private void document(boolean exporting) {
        Intent i=new Intent(exporting?Intent.ACTION_CREATE_DOCUMENT:Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");
        if(exporting)i.putExtra(Intent.EXTRA_TITLE,"JM_FOLD_ULTRA_ROOT_v0_1.json");
        safeStartForResult(i,exporting?EXPORT:IMPORT);
    }
    private void safeStartForResult(Intent intent,int id) {
        try { startActivityForResult(intent,id); }
        catch (ActivityNotFoundException e) {Toast.makeText(this,"No Android document picker available",Toast.LENGTH_LONG).show();}
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK || data==null || data.getData()==null) return;
        Uri selected=data.getData();
        try {
            if(request==EXPORT) {
                JSONObject json=new JSONObject();
                json.put("schema",SCHEMA);
                json.put("root",getPreferences(0).getString("root",""));
                json.put("device_class","dual-screen-android");
                byte[] payload=json.toString(2).getBytes(StandardCharsets.UTF_8);
                try(OutputStream out=getContentResolver().openOutputStream(selected,"w")) {
                    if(out==null)throw new IllegalStateException("No output stream");
                    out.write(payload);
                }
                Toast.makeText(this,"Root exported. File selected by you.",Toast.LENGTH_LONG).show();
            } else if(request==IMPORT) {
                ByteArrayOutputStream buffer=new ByteArrayOutputStream();
                try(InputStream in=getContentResolver().openInputStream(selected)) {
                    if(in==null)throw new IllegalStateException("No input stream");
                    byte[] bytes=new byte[2048];int n;
                    while((n=in.read(bytes))!=-1) {
                        if(buffer.size()+n>65536)throw new IllegalArgumentException("Root JSON too large");
                        buffer.write(bytes,0,n);
                    }
                }
                JSONObject json=new JSONObject(buffer.toString("UTF-8"));
                if(!SCHEMA.equals(json.optString("schema")))
                    throw new IllegalArgumentException("Unknown JM root schema");
                String note=json.getString("root");
                if(note.length()>32000)throw new IllegalArgumentException("Root note too long");
                new AlertDialog.Builder(this).setTitle("Import this root?")
                    .setMessage("Replace only this app's local root note? Existing phone data remains untouched.")
                    .setNegativeButton("Cancel",null)
                    .setPositiveButton("Import",(d,w)->{
                        getPreferences(0).edit().putString("root",note).apply();
                        draw();
                        Toast.makeText(this,"JM root imported",Toast.LENGTH_LONG).show();
                    }).show();
            }
        } catch(Exception e) {
            new AlertDialog.Builder(this).setTitle("HOLD · No state change")
                .setMessage("Import/export not completed: "+e.getMessage()).setPositiveButton("OK",null).show();
        }
    }
    private void limits(){
        new AlertDialog.Builder(this).setTitle("JM Fold Ultra v0.1 · capability boundary")
            .setMessage("WORKING: display-class layouts, app / web routes, local note, Android-approved shortcut request, import/export.\n\nNOT CLAIMED: hinge sensor contact, automated rearrangement of Samsung home pages, silent permissions, automatic phone-to-laptop pairing, physical install or Fold device Ding.\n\nExisting Samsung screens remain unchanged.")
            .setPositiveButton("Close",null).show();
    }
}
