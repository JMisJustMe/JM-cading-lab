#!/usr/bin/env python3
import pathlib, socket, sys, time
if len(sys.argv)!=3: raise SystemExit('usage: inject_keyboard.py TRACE MONITOR_SOCKET')
trace=pathlib.Path(sys.argv[1]); monitor=sys.argv[2]
deadline=time.time()+10
while time.time()<deadline:
    if trace.exists() and all(marker in trace.read_text(errors='replace') for marker in ('DEVICE INPUT: PS/2 KEYBOARD IRQ1 ACTIVE','RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES')) and pathlib.Path(monitor).exists(): break
    time.sleep(0.05)
else: raise SystemExit('HOLD: generated kernel did not reach recovered keyboard-contact route')
s=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
for _ in range(100):
    try: s.connect(monitor); break
    except OSError: time.sleep(0.05)
else: raise SystemExit('HOLD: could not connect to QEMU monitor')
s.settimeout(1)
try: s.recv(4096)
except Exception: pass
for command in ('sendkey spc\n','sendkey ret\n'):
    s.sendall(command.encode()); time.sleep(0.6)
s.close()
print('QEMU_KEYBOARD_CONTACT_INJECTION PASS')
