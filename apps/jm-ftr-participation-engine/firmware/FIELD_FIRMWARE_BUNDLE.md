# AMA-Pro / GEO Firmware Starter Bundle

## `JM_AMA_PRO_DEVICE_CONFIG_v2_0.h`

```cpp
#pragma once
#define JM_DEVICE_ID "AMA-PRO-DEVICE-01"
#define JM_SENSOR_FAMILY "FSR / FORCE"
#define JM_SAMPLE_RATE_HZ 20
#define JM_CAL_REST 100
#define JM_CAL_STRONG 900
#define JM_PACKET_SCHEMA "JM.AMAProPacket/2.0"
#define JM_SERIAL_BAUD 115200
#define JM_STALE_TIMEOUT_MS 1500
#define JM_MAX_RAW 4095

```

## `README.md`

```markdown
# Firmware starters

These files emit the governed JSONL packet schema. Adjust pins, calibration and electrical safety for the actual hardware. The firmware is a transport starter, not a physical proof or certified electrical design.

```

## `arduino_analog_jsonl_v2_0.ino`

```cpp
// JM AMA-Pro analog JSONL firmware v2.0
// Emits JM.AMAProPacket/2.0 at 115200 baud.
#include "JM_AMA_PRO_DEVICE_CONFIG_v2_0.h"
const int SENSOR_PIN=A0; const int OUTPUT_PIN=9;
unsigned long startMs=0,lastSample=0; unsigned long seqNo=0;
void setup(){Serial.begin(115200);pinMode(OUTPUT_PIN,OUTPUT);startMs=millis();}
void loop(){const unsigned long now=millis();const unsigned long period=1000UL/JM_SAMPLE_RATE_HZ;if(now-lastSample<period)return;lastSample=now;const int primary=analogRead(SENSOR_PIN);const int out=analogRead(OUTPUT_PIN);Serial.print("{\"schema\":\"JM.AMAProPacket/2.0\",\"seq\":");Serial.print(++seqNo);Serial.print(",\"t\":");Serial.print(now-startMs);Serial.print(",\"device_id\":\"");Serial.print(JM_DEVICE_ID);Serial.print("\",\"primary\":");Serial.print(primary);Serial.print(",\"output\":");Serial.print(out);Serial.println(",\"heartbeat\":true}");}

```

## `esp32_analog_jsonl_v2_0.ino`

```cpp
// JM AMA-Pro ESP32 analog JSONL firmware v2.0
// Emits JM.AMAProPacket/2.0 at 115200 baud.
#include "JM_AMA_PRO_DEVICE_CONFIG_v2_0.h"
const int SENSOR_PIN=34; const int OUTPUT_PIN=35;
unsigned long startMs=0,lastSample=0; unsigned long seqNo=0;
void setup(){Serial.begin(115200);pinMode(OUTPUT_PIN,OUTPUT);startMs=millis();}
void loop(){const unsigned long now=millis();const unsigned long period=1000UL/JM_SAMPLE_RATE_HZ;if(now-lastSample<period)return;lastSample=now;const int primary=analogRead(SENSOR_PIN);const int out=analogRead(OUTPUT_PIN);Serial.print("{\"schema\":\"JM.AMAProPacket/2.0\",\"seq\":");Serial.print(++seqNo);Serial.print(",\"t\":");Serial.print(now-startMs);Serial.print(",\"device_id\":\"");Serial.print(JM_DEVICE_ID);Serial.print("\",\"primary\":");Serial.print(primary);Serial.print(",\"output\":");Serial.print(out);Serial.println(",\"heartbeat\":true}");}

```

## `esp32_hx711_load_cell_v2_0.ino`

```cpp
// JM AMA-Pro ESP32 + HX711 load-cell JSONL v2.0
#include "HX711.h"
#define DOUT 4
#define CLK 5
HX711 scale; unsigned long startMs=0,lastSample=0,seqNo=0;
void setup(){Serial.begin(115200);scale.begin(DOUT,CLK);startMs=millis();}
void loop(){if(millis()-lastSample<50||!scale.is_ready())return;lastSample=millis();long primary=scale.read();Serial.printf("{\"schema\":\"JM.AMAProPacket/2.0\",\"seq\":%lu,\"t\":%lu,\"device_id\":\"AMA-PRO-HX711-01\",\"primary\":%ld,\"output\":0,\"heartbeat\":true}\n",++seqNo,millis()-startMs,primary);}

```

## `esp32_microphone_air_v2_0.ino`

```cpp
// JM AMA-Pro ESP32 microphone / air-pressure envelope JSONL v2.0
const int MIC_PIN=34; unsigned long startMs=0,lastSample=0,seqNo=0;
void setup(){Serial.begin(115200);startMs=millis();}
void loop(){if(millis()-lastSample<40)return;lastSample=millis();int minV=4095,maxV=0;for(int i=0;i<64;i++){int v=analogRead(MIC_PIN);if(v<minV)minV=v;if(v>maxV)maxV=v;}int envelope=maxV-minV;Serial.printf("{\"schema\":\"JM.AMAProPacket/2.0\",\"seq\":%lu,\"t\":%lu,\"device_id\":\"AMA-PRO-AIR-01\",\"primary\":%d,\"output\":0,\"heartbeat\":true}\n",++seqNo,millis()-startMs,envelope);}

```

## `micropython_analog_jsonl_v2_0.py`

```python
# JM AMA-Pro MicroPython analog JSONL v2.0
from machine import ADC, Pin
import time, ujson
adc=ADC(Pin(34)); adc.atten(ADC.ATTN_11DB)
start=time.ticks_ms(); seq=0
while True:
    seq += 1
    packet={"schema":"JM.AMAProPacket/2.0","seq":seq,"t":time.ticks_diff(time.ticks_ms(),start),"device_id":"AMA-PRO-MPY-01","primary":adc.read(),"output":0,"heartbeat":True}
    print(ujson.dumps(packet))
    time.sleep_ms(50)

```
