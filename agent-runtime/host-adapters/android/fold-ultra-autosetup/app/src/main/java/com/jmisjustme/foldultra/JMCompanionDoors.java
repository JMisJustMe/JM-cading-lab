package com.jmisjustme.foldultra;

import android.content.Intent;
import android.net.Uri;

/**
 * JM Companion Doors CP01 — outbound navigation to independent providers.
 * Not an API client, credential store, copied/modified third-party APK or
 * assertion of official partnership. No inbound commands or persisted state.
 */
public final class JMCompanionDoors {
  private JMCompanionDoors() {}
  public static final class Door {
    public final String id, title, host, url, purpose, kind;
    private Door(String id,String title,String host,String url,String purpose,String kind){
      this.id=id;this.title=title;this.host=host;this.url=url;this.purpose=purpose;this.kind=kind;
    }
  }
  public static final Door[] DOORS={
    new Door("estate","JM ECOSTATE","jmisjustme.github.io","https://jmisjustme.github.io/JM-cading-lab/","Original JM public Estate; owned source door.","JM SOURCE"),
    new Door("github","GitHub","github.com","https://github.com/JMisJustMe/JM-cading-lab","JM source repository, code, issues and reviews.","EXTERNAL"),
    new Door("chatgpt","ChatGPT","chatgpt.com","https://chatgpt.com/","OpenAI's own service or supported app handoff.","EXTERNAL"),
    new Door("gemini","Gemini","gemini.google.com","https://gemini.google.com/","Google's Gemini service or supported app handoff.","EXTERNAL"),
    new Door("drive","Google Drive","drive.google.com","https://drive.google.com/drive/","Owner's cloud files through Google's service.","EXTERNAL"),
    new Door("gmail","Gmail","mail.google.com","https://mail.google.com/mail/","Owner's mail through Google's service.","EXTERNAL"),
    new Door("dropbox","Dropbox","www.dropbox.com","https://www.dropbox.com/home","Owner's files through Dropbox's service.","EXTERNAL"),
    new Door("copilot","Microsoft Copilot","copilot.microsoft.com","https://copilot.microsoft.com/","Microsoft's AI service or supported app handoff.","EXTERNAL")
  };
  public static Door find(String id){
    if(id==null)throw new IllegalArgumentException("Missing door");
    for(Door door:DOORS)if(door.id.equals(id))return door;
    throw new IllegalArgumentException("Unknown JM door");
  }
  public static Intent intentFor(String id){
    Door door=find(id);
    Uri uri=Uri.parse(door.url);
    if(!"https".equals(uri.getScheme()) || uri.getUserInfo()!=null ||
       uri.getPort()!=-1 || !door.host.equals(uri.getHost()) || uri.getFragment()!=null)
      throw new IllegalArgumentException("Unsafe companion route");
    Intent out=new Intent(Intent.ACTION_VIEW,uri);
    out.addCategory(Intent.CATEGORY_BROWSABLE);
    return out;
  }
}
