"""JM independent MCP client transport: Gemini CLI stdio -> authenticated JM HTTPS MCP.

CARRIER ONLY, not a merge, engine or generic new authority. Remote services retain
their original schemas, tools, bearer and source. Never logs arguments or secrets.
The two canonical production URLs are fixed below. No public proxy server is started.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

TARGETS={
  'commons':('https://jm-app-commons-cp06-mcp.onrender.com/mcp','JM_COMMONS_REMOTE_TOKEN'),
  'receipt':('https://jm-federation-receipt-cp02-mcp.onrender.com/mcp','JM_RECEIPT_REMOTE_TOKEN')
}
MAX_BYTES=65000

def strict_pairs(pairs):
  d={}
  for name,value in pairs:
    if name in d:raise ValueError('duplicate key')
    d[name]=value
  return d

def selection(label):
  if label not in TARGETS:raise ValueError('unknown independent JM target')
  uri,key=TARGETS[label]
  override=os.environ.get('JM_PROXY_TEST_URL')
  if override is not None:
    if os.environ.get('JM_PROXY_TEST_ONLY')!='1' or not re.fullmatch(
      r'http://127\.0\.0\.1:\d+/mcp',override):
      raise ValueError('HOLD: test transport override must be exact loopback only')
    uri=override
  token=os.environ.get(key,'')
  if len(token)<24:raise ValueError('HOLD: missing secured JM bearer environment variable '+key)
  return uri,token

def failure(identifier,code,message):
  return {'jsonrpc':'2.0','id':identifier,'error':{'code':code,'message':message}}

def transport(request,uri,token):
  raw=json.dumps(request,separators=(',',':'),ensure_ascii=False).encode('utf-8')
  if len(raw)>MAX_BYTES:return failure(request.get('id'),-32600,'HOLD: message exceeds bounded transport')
  headers={
    'Content-Type':'application/json',
    'Accept':'application/json, text/event-stream',
    'Authorization':'Bearer '+token
  }
  try:
    req=urllib.request.Request(uri,data=raw,headers=headers,method='POST')
    with urllib.request.urlopen(req,timeout=25) as response:
      if response.status==202:return None
      if response.status!=200:raise ValueError('unexpected status')
      payload=response.read(1048577)
      if len(payload)>1048576:raise ValueError('oversized reply')
      result=json.loads(payload,object_pairs_hook=strict_pairs)
      if not isinstance(result,dict) or result.get('jsonrpc')!='2.0':
        raise ValueError('invalid downstream JSON-RPC')
      return result
  except urllib.error.HTTPError as error:
    return failure(request.get('id'),-32010,'Remote JM MCP denied or unavailable: HTTP '+str(error.code))
  except (urllib.error.URLError,OSError,ValueError,json.JSONDecodeError):
    return failure(request.get('id'),-32011,'Remote JM MCP connection or response HOLD')

def main():
  parser=argparse.ArgumentParser()
  parser.add_argument('--target',required=True,choices=tuple(TARGETS))
  label=parser.parse_args().target
  try:uri,token=selection(label)
  except ValueError as error:
    print(str(error),file=sys.stderr)
    raise SystemExit(2)
  for line in sys.stdin:
    if len(line.encode('utf-8'))>MAX_BYTES:
      continue
    try:request=json.loads(line,object_pairs_hook=strict_pairs)
    except (ValueError,TypeError):
      sys.stdout.write(json.dumps(failure(None,-32700,'Invalid bounded JSON request'))+'\n')
      sys.stdout.flush()
      continue
    if not isinstance(request,dict) or request.get('jsonrpc')!='2.0':
      sys.stdout.write(json.dumps(failure(None,-32600,'Expected JSON-RPC object'))+'\n')
      sys.stdout.flush()
      continue
    response=transport(request,uri,token)
    if response is not None:
      sys.stdout.write(json.dumps(response,separators=(',',':'),ensure_ascii=False)+'\n')
      sys.stdout.flush()
if __name__=='__main__':main()
