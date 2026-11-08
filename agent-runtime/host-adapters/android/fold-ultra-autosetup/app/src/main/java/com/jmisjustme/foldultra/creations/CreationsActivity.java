package com.jmisjustme.foldultra.creations;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;

/**
 * Native routes to independently owned JM creation bodies.
 * No embedded source copies, implicit installations, launcher takeover or cloud credentials.
 */
public final class CreationsActivity extends Activity {
    static final int BACK=0xff090e19, PANEL=0xff142238, INK=0xffedf4ff,
            SUB=0xffb3c6d9, AQUA=0xff74e4d2, BLUE=0xff77bfff, HOLD=0xffffd777;
    final ArrayList<Group> groups=new ArrayList<>();
    static final class Entry {
        View view; String terms;
        Entry(View v,String s){view=v;terms=s;}
    }
    static final class Group {
        View header; final ArrayList<Entry> entries=new ArrayList<>();
    }
    int dp(float n){return (int)(getResources().getDisplayMetrics().density*n+0.5f);}
    GradientDrawable shape(int fill,int stroke,int radius){
        GradientDrawable d=new GradientDrawable();
        d.setColor(fill);d.setCornerRadius(dp(radius));
        if(stroke!=0)d.setStroke(dp(1),stroke);return d;
    }
    TextView text(String value,int size,int color,boolean strong){
        TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);
        t.setLineSpacing(dp(2),1.08f);
        if(strong)t.setTypeface(null,1);
        return t;
    }
    LinearLayout.LayoutParams full(int top){
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);
        p.setMargins(0,dp(top),0,0);return p;
    }
    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        getWindow().setStatusBarColor(BACK);getWindow().setNavigationBarColor(BACK);
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);scroll.setBackgroundColor(BACK);
        LinearLayout root=new LinearLayout(this);root.setOrientation(1);
        root.setPadding(dp(18),dp(28),dp(18),dp(22));
        if(Build.VERSION.SDK_INT>=35){
            root.setOnApplyWindowInsetsListener((v,insets)->{
                Insets safe=insets.getInsets(WindowInsets.Type.systemBars());
                v.setPadding(dp(18),safe.top+dp(18),dp(18),safe.bottom+dp(22));
                return insets;
            });
        }
        scroll.addView(root);setContentView(scroll);
        Button back=button("← JM FOLD ULTRA / ROOT",false);
        root.addView(back,full(3));back.setOnClickListener(v->finish());
        root.addView(text("JM / ECOSTATE  ·  ORIGINAL ENTRANCES",11,AQUA,true),full(17));
        root.addView(text("My Creations",32,INK,true),full(5));
        root.addView(text("The same original bodies, reached through current verified doors. Links are contacts, not replacements. Nothing launches without a tap.",14,SUB,false),full(10));
        EditText search=new EditText(this);
        search.setSingleLine(true);search.setTextColor(INK);search.setHintTextColor(SUB);
        search.setTextSize(15);search.setHint("Find OPENBOX, games, coding, theories…");
        search.setBackground(shape(PANEL,0xff365777,13));
        search.setPadding(dp(13),dp(10),dp(13),dp(10));
        search.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
        root.addView(search,full(17));
        try{
            InputStream in=getAssets().open("jm_creations_doors.v1.json");
            java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();
            byte[] bytes=new byte[4096];int read;
            while((read=in.read(bytes))!=-1)out.write(bytes,0,read);
            in.close();
            JSONObject source=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
            JSONArray sections=source.getJSONArray("sections");int total=0;
            for(int i=0;i<sections.length();i++){
                JSONObject section=sections.getJSONObject(i);
                JSONArray entries=section.getJSONArray("entries");
                Group group=new Group();
                TextView header=text(section.optString("label","JM House")+"  ·  "+entries.length(),20,BLUE,true);
                group.header=header;root.addView(header,full(23));
                for(int j=0;j<entries.length();j++){
                    JSONObject item=entries.getJSONObject(j);
                    String label=item.optString("label","JM creation");
                    String kind=item.optString("kind","hold");
                    String status=item.optString("status","HOLD");
                    String version=item.optString("version","");
                    LinearLayout tile=new LinearLayout(this);tile.setOrientation(1);
                    tile.setPadding(dp(12),dp(11),dp(12),dp(9));
                    tile.setBackground(shape(PANEL,kind.equals("hold")?0xff62512b:0xff2d5168,14));
                    TextView caption=text(status+(version.isEmpty()?"":"  ·  "+version),11,
                            kind.equals("hold")?HOLD:AQUA,true);
                    tile.addView(caption);
                    Button btt=button(label+(kind.equals("hold")?"  ·  HOLD":"  ↗"),false);
                    btt.setContentDescription(label+"; "+status+"; tap for an explicit launch decision");
                    btt.setEnabled(!kind.equals("hold"));
                    tile.addView(btt,full(5));
                    btt.setOnClickListener(v->requestLaunch(item));
                    root.addView(tile,full(8));total++;
                    group.entries.add(new Entry(tile,(label+" "+status+" "+section.optString("label","")).toLowerCase(Locale.ROOT)));
                }
                groups.add(group);
            }
            root.addView(text(total+" separately identified entrances · checked 8 November 2026. Public links can change; this is not an automatic latest-build installer.",12,SUB,false),full(20));
        }catch(Exception e){
            root.addView(text("HOLD · Creation registry could not be opened. Original app and other rooms remain untouched.",14,HOLD,false),full(20));
        }
        search.addTextChangedListener(new TextWatcher(){
            @Override public void beforeTextChanged(CharSequence s,int start,int count,int after){}
            @Override public void onTextChanged(CharSequence s,int start,int before,int count){filter(s.toString());}
            @Override public void afterTextChanged(Editable s){}
        });
    }
    Button button(String name,boolean primary){
        Button b=new Button(this);b.setText(name);b.setAllCaps(false);b.setTextSize(15);
        b.setTextColor(primary?BACK:INK);
        b.setGravity(android.view.Gravity.CENTER_VERTICAL|android.view.Gravity.START);
        b.setPadding(dp(12),dp(10),dp(12),dp(10));
        b.setBackground(shape(primary?AQUA:0xff1c314c,primary?0:0xff355675,12));
        b.setMinHeight(dp(50));return b;
    }
    void filter(String q){
        String wanted=q.trim().toLowerCase(Locale.ROOT);
        for(Group g:groups){
            boolean any=false;
            for(Entry e:g.entries){
                boolean found=wanted.isEmpty()||e.terms.contains(wanted);
                e.view.setVisibility(found?View.VISIBLE:View.GONE);
                any|=found;
            }
            g.header.setVisibility(any?View.VISIBLE:View.GONE);
        }
    }
    void requestLaunch(JSONObject item){
        String label=item.optString("label","JM creation");
        String kind=item.optString("kind","hold");
        try{
            if("android".equals(kind)){
                String pkg=item.getString("package");
                if(!pkg.matches("[a-zA-Z][a-zA-Z0-9_.]{2,180}"))throw new IllegalArgumentException();
                Intent launch=getPackageManager().getLaunchIntentForPackage(pkg);
                if(launch==null){notice("HOLD · "+label+" is not visible as an installed launchable app on this device.");return;}
                new AlertDialog.Builder(this).setTitle("Open "+label+"?")
                    .setMessage("Open its independently installed Android app. No source bodies are copied.")
                    .setNegativeButton("Stay",null)
                    .setPositiveButton("Open",(d,w)->startActivity(launch)).show();
                return;
            }
            if(!"web".equals(kind)){notice("HOLD · No independently verified launch target.");return;}
            String target=item.getString("url");
            URI uri=new URI(target);
            String host=uri.getHost();
            if(!"https".equalsIgnoreCase(uri.getScheme())||host==null
                    ||uri.getUserInfo()!=null||uri.getPort()!=-1
                    ||target.contains("\n")||target.contains("\r")||host.equalsIgnoreCase("localhost"))
                throw new IllegalArgumentException();
            boolean gated=item.optString("status","").contains("PRIVATE");
            new AlertDialog.Builder(this).setTitle("Open "+label+"?")
                .setMessage((gated?"Private source: use your existing authorised GitHub sign-in.\n\n":"")+
                        "This opens an external original route. It does not install, replace or copy a JM body.\n\n"+target)
                .setNegativeButton("Stay",null)
                .setPositiveButton("Open",(d,w)->{
                    try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(target)));}
                    catch(Exception x){notice("HOLD · No browser is available to open this route.");}
                }).show();
        }catch(Exception x){notice("HOLD · This source route is not currently safe to launch.");}
    }
    void notice(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
}
