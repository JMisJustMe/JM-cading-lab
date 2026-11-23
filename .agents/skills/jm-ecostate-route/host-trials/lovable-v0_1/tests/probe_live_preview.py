#!/usr/bin/env python3
"""Read-only synthetic end-to-end Lovable preview probe. No mic, recording or private data."""
from __future__ import annotations
import asyncio, json, re, os, traceback
from pathlib import Path
from playwright.async_api import async_playwright

URL="https://id-preview--f52a4ff2-3df8-4e2d-9c2c-b8070b32bcac.lovable.app"
OUT=Path("lovable_live_receipts")
OUT.mkdir(exist_ok=True)
receipt={
 "schema":"JM.LovableHostPreviewContact/0.1",
 "original_lovable_commit":"bb950f387ee04206c900465e0cc83b7000b4d215",
 "url":URL,
 "state":"HELD",
 "result":"NOT_YET_TESTED",
 "checks":{},
 "microphone_hardware_contact":"NOT_ATTEMPTED",
 "owner_device_contact":"NOT_ATTEMPTED",
 "external_agent_autodiscovery":"NOT_PROVEN",
 "private_sources_used":False,
}
async def probe():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True)
    page=await browser.new_page(viewport={"width":390,"height":844})
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    try:
      response=await page.goto(URL,wait_until="domcontentloaded",timeout=90000)
      receipt["checks"]["http"]={"status":response.status if response else None}
      await page.get_by_role("heading",name="Testbench").wait_for(timeout=45000)
      receipt["checks"]["visible_interface"]="PASS"
      await page.get_by_role("button",name=re.compile("Load sample")).click()
      await page.get_by_text("UNTRUSTED DATA",exact=False).first.wait_for(timeout=10000)
      receipt["checks"]["sample_attack_quarantine"]="PASS"
      await page.screenshot(path=str(OUT/"capture_390.png"),full_page=True)
      await page.get_by_role("button",name="Search",exact=True).click()
      await page.locator("input[placeholder='Search terms…']").fill("instructions")
      await page.get_by_text("L3",exact=True).wait_for(timeout=10000)
      await page.locator("li input[type=checkbox]").first.check()
      await page.get_by_role("button",name=re.compile("Create HELD candidate")).click()
      await page.get_by_text("STATE: HELD",exact=False).first.wait_for(timeout=10000)
      receipt["checks"]["searched_source_to_held_candidate"]="PASS"
      await page.get_by_role("button",name="Q/K/V",exact=True).click()
      await page.get_by_text("Demo computation — NOT a trained transformer").first.wait_for(timeout=10000)
      receipt["checks"]["qkv_interface"]="PASS"
      await page.screenshot(path=str(OUT/"attention_390.png"),full_page=True)
      await page.get_by_role("button",name="Receipts",exact=True).click()
      await page.get_by_role("button",name="Run receipts").click()
      await page.get_by_text(re.compile(r"7/7 passed")).wait_for(timeout=20000)
      receipt["checks"]["real_browser_receipts"]="PASS"
      await page.get_by_role("button",name="Capture",exact=True).click()
      f=page.locator('input[type="file"]')
      await f.set_input_files({"name":"sample.txt","mimeType":"text/plain","buffer":b"Alpha source line\nSecond source line"})
      await page.get_by_text("Second source line",exact=False).first.wait_for(timeout=10000)
      receipt["checks"]["file_picker_import"]="PASS"
      if errors:raise RuntimeError("BROWSER_JS_ERRORS: "+str(errors[:3]))
      receipt["checks"]["no_runtime_errors"]="PASS"
      receipt["result"]="PASS_WEB_BROWSER_SYNTHETIC"
    except Exception as err:
      receipt["result"]="FAIL_OR_BLOCKED_WEB_BROWSER_SYNTHETIC"
      receipt["error_type"]=type(err).__name__
      receipt["error_message"]=str(err)[:650]
      receipt["checks"]["no_runtime_errors"]="INDETERMINATE" if not errors else "FAIL"
      try:await page.screenshot(path=str(OUT/"failure.png"),full_page=True)
      except Exception:pass
    finally:
      receipt["browser_errors"]=errors[:5]
      await browser.close()
      (OUT/"receipt.json").write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n",encoding="utf-8")
      print(json.dumps(receipt,indent=2))
      if receipt["result"]!="PASS_WEB_BROWSER_SYNTHETIC":
        raise SystemExit(1)

if __name__=="__main__":
  asyncio.run(probe())
