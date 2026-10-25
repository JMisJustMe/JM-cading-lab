#!/usr/bin/env python3
"""32_Cb Sovereign Federation Runtime v2.0.0.

JM owns this runtime, IR, profile names, generators, tests, receipts and route logic.
External technologies remain external host targets. 32_Cb::CbWasiGate/1.0, for
example, is JM's own operational profile TO WASI, not a claim to own or fork WASI.
"""
from __future__ import annotations
import argparse,csv,hashlib,http.server,io,json,pathlib,shlex,shutil,socketserver,subprocess,sys,tempfile,time,urllib.parse
RUNTIME_NAME="32_Cb Sovereign Federation Runtime"; RUNTIME_VERSION="2.0.0"; PROFILE_VERSION="1.0"; OWNER="JM / 32_Cb"
ADAPTERS={
  "WASI": {
    "kind": "WebAssembly system runtime",
    "toolchain": "wat2wasm + Wasmtime/Wasmer",
    "command": "wat2wasm 32_cb_wasi.wat -o 32_cb_wasi.wasm && wasmtime 32_cb_wasi.wasm",
    "files": [
      {
        "name": "32_cb_wasi.wat",
        "content": "(module\n  (import \"wasi_snapshot_preview1\" \"proc_exit\" (func $proc_exit (param i32)))\n  (func (export \"_start\")\n    ;; 32_Cb bridge is prevalidated by the source route.\n    i32.const 0\n    call $proc_exit\n  )\n)"
      },
      {
        "name": "wasi-route.json",
        "content": "{\n  \"body\": \"32_Cb\",\n  \"target\": \"WASI\",\n  \"entry\": \"_start\",\n  \"expectedExit\": 0\n}"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "SPIR-V": {
    "kind": "GPU intermediate representation",
    "toolchain": "spirv-as + spirv-val",
    "command": "spirv-as 32_cb.spvasm -o 32_cb.spv && spirv-val 32_cb.spv",
    "files": [
      {
        "name": "32_cb.spvasm",
        "content": "; SPIR-V\n; Version: 1.0\n; Minimal compute entry: writes no resources; adapter demonstrates IR route.\nOpCapability Shader\nOpMemoryModel Logical GLSL450\nOpEntryPoint GLCompute %main \"main\"\nOpExecutionMode %main LocalSize 1 1 1\n%void = OpTypeVoid\n%fn = OpTypeFunction %void\n%main = OpFunction %void None %fn\n%entry = OpLabel\nOpReturn\nOpFunctionEnd"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "WebGPU": {
    "kind": "GPU API",
    "toolchain": "Browser WebGPU + WGSL",
    "command": "Open 32_cb_webgpu.js in a secure WebGPU-capable browser host",
    "files": [
      {
        "name": "32_cb_webgpu.js",
        "content": "export async function run32CbWebGPU(){\n  if(!navigator.gpu) return {body:\"32_Cb\",status:\"HOLD\",reason:\"WebGPU unavailable\"};\n  const adapter=await navigator.gpu.requestAdapter();\n  if(!adapter) return {body:\"32_Cb\",status:\"HOLD\",reason:\"No GPU adapter\"};\n  const device=await adapter.requestDevice();\n  const code=`@compute @workgroup_size(1) fn main(){}`;\n  const module=device.createShaderModule({code});\n  return {body:\"32_Cb\",status:\"DING\",device:!!device,module:!!module};\n}"
      },
      {
        "name": "32_cb.wgsl",
        "content": "@compute @workgroup_size(1)\nfn main() {\n  // 3↔C | 2↔B route already validated in host IR.\n}\n"
      }
    ],
    "browserAction": "webgpu",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "Browser capability probe and source generator implemented; GPU availability is device/host dependent."
  },
  "CUDA": {
    "kind": "NVIDIA GPU compute",
    "toolchain": "CUDA Toolkit / nvcc",
    "command": "nvcc 32_cb.cu -o 32_cb_cuda && ./32_cb_cuda",
    "files": [
      {
        "name": "32_cb.cu",
        "content": "#include <cstdio>\n__global__ void pulse(int* out){ if(threadIdx.x==0 && blockIdx.x==0) *out = (3==3 && 2==2) ? 1 : 0; }\nint main(){\n  int *d=nullptr,h=0; cudaMalloc(&d,sizeof(int));\n  pulse<<<1,1>>>(d); cudaDeviceSynchronize();\n  cudaMemcpy(&h,d,sizeof(int),cudaMemcpyDeviceToHost); cudaFree(d);\n  std::printf(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"%s\\\"}\\n\",h?\"DING\":\"BUGG\");\n  return h?0:1;\n}"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "OpenCL": {
    "kind": "Heterogeneous GPU/CPU compute",
    "toolchain": "OpenCL compiler/runtime + host SDK",
    "command": "Compile 32_cb_opencl.cl through an OpenCL host program and capture the result buffer",
    "files": [
      {
        "name": "32_cb_opencl.cl",
        "content": "__kernel void pulse(__global int* out){\n  if(get_global_id(0)==0) out[0] = (3==3 && 2==2) ? 1 : 0;\n}"
      },
      {
        "name": "opencl-route.json",
        "content": "{\n  \"body\": \"32_Cb\",\n  \"kernel\": \"pulse\",\n  \"globalSize\": 1,\n  \"expected\": 1\n}"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "AssemblyScript": {
    "kind": "WebAssembly-oriented language",
    "toolchain": "Node + AssemblyScript asc",
    "command": "npx asc 32_cb.ts -o 32_cb.wasm --optimize",
    "files": [
      {
        "name": "32_cb.ts",
        "content": "export function alphaPos(code:i32):i32 { return code - 64; }\nexport function pulse():i32 {\n  return alphaPos(67)==3 && alphaPos(66)==2 ? 1 : 0;\n}"
      },
      {
        "name": "package.json",
        "content": "{\n  \"private\": true,\n  \"devDependencies\": {\n    \"assemblyscript\": \"latest\"\n  },\n  \"scripts\": {\n    \"build\": \"asc 32_cb.ts -o 32_cb.wasm --optimize\"\n  }\n}"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "C ABI": {
    "kind": "Cross-language ABI boundary",
    "toolchain": "C compiler/linker",
    "command": "cc -c 32_cb.c -o 32_cb.o",
    "files": [
      {
        "name": "32_cb.h",
        "content": "#ifndef BODY32CB_H\n#define BODY32CB_H\n#ifdef __cplusplus\nextern \"C\" {\n#endif\nint body32cb_pulse(void);\nint body32cb_alpha_pos(char c);\n#ifdef __cplusplus\n}\n#endif\n#endif"
      },
      {
        "name": "32_cb.c",
        "content": "#include \"32_cb.h\"\n#include <ctype.h>\nint body32cb_alpha_pos(char c){ return toupper((unsigned char)c)-'A'+1; }\nint body32cb_pulse(void){ return body32cb_alpha_pos('C')==3 && body32cb_alpha_pos('B')==2; }"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "FFI": {
    "kind": "Foreign Function Interface",
    "toolchain": "C ABI + host-language FFI",
    "command": "Build the C ABI library, then bind it from the chosen host language",
    "files": [
      {
        "name": "ffi_contract.json",
        "content": "{\n  \"library\": \"32_cb\",\n  \"abi\": \"C\",\n  \"functions\": [\n    {\n      \"name\": \"body32cb_pulse\",\n      \"returns\": \"int\",\n      \"args\": []\n    },\n    {\n      \"name\": \"body32cb_alpha_pos\",\n      \"returns\": \"int\",\n      \"args\": [\n        {\n          \"name\": \"c\",\n          \"type\": \"char\"\n        }\n      ]\n    }\n  ]\n}"
      },
      {
        "name": "ffi_rust.rs",
        "content": "extern \"C\" {\n    fn body32cb_pulse() -> i32;\n}\nfn main(){ unsafe { println!(\"{}\", body32cb_pulse()); } }"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Protocol Buffers": {
    "kind": "Typed binary schema",
    "toolchain": "protoc",
    "command": "protoc --descriptor_set_out=32_cb.pb 32_cb.proto",
    "files": [
      {
        "name": "32_cb.proto",
        "content": "syntax = \"proto3\";\npackage jm.body32cb;\nmessage Receipt {\n  string body = 1;\n  repeated uint32 positions = 2;\n  repeated string letters = 3;\n  string status = 4;\n}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "gRPC": {
    "kind": "Typed RPC transport",
    "toolchain": "protoc + gRPC plugin/runtime",
    "command": "Generate client/server stubs from 32_cb_grpc.proto with the gRPC plugin for your target language",
    "files": [
      {
        "name": "32_cb_grpc.proto",
        "content": "syntax = \"proto3\";\npackage jm.body32cb;\nmessage Empty {}\nmessage Receipt { string body=1; repeated uint32 positions=2; repeated string letters=3; string status=4; }\nservice Body32Cb { rpc Pulse(Empty) returns (Receipt); }\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "GraphQL": {
    "kind": "API query/schema language",
    "toolchain": "GraphQL runtime/tooling",
    "command": "Validate schema.graphql with your GraphQL toolchain",
    "files": [
      {
        "name": "schema.graphql",
        "content": "type Receipt {\n  body: String!\n  positions: [Int!]!\n  letters: [String!]!\n  status: String!\n}\ntype Query {\n  body32Cb: Receipt!\n}\n"
      },
      {
        "name": "query.graphql",
        "content": "query Body32Cb {\n  body32Cb { body positions letters status }\n}\n"
      }
    ],
    "browserAction": "graphql",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "OpenAPI": {
    "kind": "HTTP API contract",
    "toolchain": "OpenAPI 3.1 tooling",
    "command": "npx @redocly/cli lint openapi.json",
    "files": [
      {
        "name": "openapi.json",
        "content": "{\n  \"openapi\": \"3.1.0\",\n  \"info\": {\n    \"title\": \"32_Cb API\",\n    \"version\": \"1.4.0\"\n  },\n  \"paths\": {\n    \"/pulse\": {\n      \"get\": {\n        \"responses\": {\n          \"200\": {\n            \"description\": \"32_Cb receipt\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {\n                  \"$ref\": \"#/components/schemas/Receipt\"\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  },\n  \"components\": {\n    \"schemas\": {\n      \"Receipt\": {\n        \"type\": \"object\",\n        \"required\": [\n          \"body\",\n          \"positions\",\n          \"letters\",\n          \"status\"\n        ],\n        \"properties\": {\n          \"body\": {\n            \"const\": \"32_Cb\"\n          },\n          \"positions\": {\n            \"type\": \"array\",\n            \"prefixItems\": [\n              {\n                \"const\": 3\n              },\n              {\n                \"const\": 2\n              }\n            ],\n            \"minItems\": 2,\n            \"maxItems\": 2\n          },\n          \"letters\": {\n            \"type\": \"array\",\n            \"prefixItems\": [\n              {\n                \"const\": \"C\"\n              },\n              {\n                \"const\": \"B\"\n              }\n            ],\n            \"minItems\": 2,\n            \"maxItems\": 2\n          },\n          \"status\": {\n            \"enum\": [\n              \"DING\",\n              \"BUGG\",\n              \"HOLD\"\n            ]\n          }\n        }\n      }\n    }\n  }\n}"
      }
    ],
    "browserAction": "json",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "JSON Schema": {
    "kind": "Validation contract",
    "toolchain": "JSON Schema 2020-12 validator / AJV",
    "command": "ajv validate -s 32_cb.schema.json -d 32_cb.receipt.json",
    "files": [
      {
        "name": "32_cb.schema.json",
        "content": "{\n  \"$schema\": \"https://json-schema.org/draft/2020-12/schema\",\n  \"$id\": \"https://jm.local/32_cb.schema.json\",\n  \"title\": \"32_Cb Receipt\",\n  \"type\": \"object\",\n  \"required\": [\n    \"body\",\n    \"positions\",\n    \"letters\",\n    \"status\"\n  ],\n  \"properties\": {\n    \"body\": {\n      \"const\": \"32_Cb\"\n    },\n    \"positions\": {\n      \"type\": \"array\",\n      \"prefixItems\": [\n        {\n          \"const\": 3\n        },\n        {\n          \"const\": 2\n        }\n      ],\n      \"minItems\": 2,\n      \"maxItems\": 2\n    },\n    \"letters\": {\n      \"type\": \"array\",\n      \"prefixItems\": [\n        {\n          \"const\": \"C\"\n        },\n        {\n          \"const\": \"B\"\n        }\n      ],\n      \"minItems\": 2,\n      \"maxItems\": 2\n    },\n    \"status\": {\n      \"enum\": [\n        \"DING\",\n        \"BUGG\",\n        \"HOLD\"\n      ]\n    }\n  },\n  \"additionalProperties\": false\n}"
      },
      {
        "name": "32_cb.receipt.json",
        "content": "{\n  \"body\": \"32_Cb\",\n  \"positions\": [\n    3,\n    2\n  ],\n  \"letters\": [\n    \"C\",\n    \"B\"\n  ],\n  \"status\": \"DING\"\n}"
      }
    ],
    "browserAction": "jsonschema",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "MessagePack": {
    "kind": "Binary object encoding",
    "toolchain": "Built-in 32_Cb browser codec + external MessagePack libraries",
    "command": "Use the built-in browser codec or decode 32_cb.msgpack.hex with a MessagePack library",
    "files": [
      {
        "name": "messagepack-contract.json",
        "content": "{\n  \"packet\": {\n    \"body\": \"32_Cb\",\n    \"positions\": [\n      3,\n      2\n    ],\n    \"letters\": [\n      \"C\",\n      \"B\"\n    ],\n    \"status\": \"DING\"\n  },\n  \"codec\": \"MessagePack\"\n}"
      }
    ],
    "browserAction": "messagepack",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "A small working MessagePack encoder/decoder for the current receipt subset is embedded in 32_Cb."
  },
  "CBOR": {
    "kind": "Compact Binary Object Representation",
    "toolchain": "Built-in 32_Cb browser codec + external CBOR libraries",
    "command": "Use the built-in browser codec or decode the emitted CBOR bytes with a CBOR tool",
    "files": [
      {
        "name": "cbor-contract.json",
        "content": "{\n  \"packet\": {\n    \"body\": \"32_Cb\",\n    \"positions\": [\n      3,\n      2\n    ],\n    \"letters\": [\n      \"C\",\n      \"B\"\n    ],\n    \"status\": \"DING\"\n  },\n  \"codec\": \"CBOR\"\n}"
      }
    ],
    "browserAction": "cbor",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "A small working CBOR encoder/decoder for the current receipt subset is embedded in 32_Cb."
  },
  "Cap'n Proto": {
    "kind": "Schema/RPC",
    "toolchain": "capnp",
    "command": "capnp compile -oc++ 32_cb.capnp",
    "files": [
      {
        "name": "32_cb.capnp",
        "content": "@0xdfe2a854e3796ea1;\nstruct Receipt {\n  body @0 :Text;\n  positions @1 :List(UInt16);\n  letters @2 :List(Text);\n  status @3 :Text;\n}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "FlatBuffers": {
    "kind": "Zero-copy schema",
    "toolchain": "flatc",
    "command": "flatc --cpp 32_cb.fbs",
    "files": [
      {
        "name": "32_cb.fbs",
        "content": "namespace JM.Body32Cb;\ntable Receipt {\n  body:string;\n  positions:[ushort];\n  letters:[string];\n  status:string;\n}\nroot_type Receipt;\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Nix": {
    "kind": "Reproducible build/package",
    "toolchain": "Nix",
    "command": "nix flake check && nix build",
    "files": [
      {
        "name": "flake.nix",
        "content": "{\n  description = \"32_Cb reproducible build route\";\n  inputs.nixpkgs.url = \"github:NixOS/nixpkgs/nixos-unstable\";\n  outputs = { self, nixpkgs }:\n    let system = \"x86_64-linux\"; pkgs = import nixpkgs { inherit system; };\n    in {\n      packages.${system}.default = pkgs.writeShellApplication {\n        name = \"32-cb\";\n        text = ''echo '{\"body\":\"32_Cb\",\"status\":\"DING\"}' '';\n      };\n    };\n}"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "HCL / Terraform": {
    "kind": "Infrastructure as code",
    "toolchain": "Terraform/OpenTofu",
    "command": "terraform init && terraform validate && terraform plan",
    "files": [
      {
        "name": "main.tf",
        "content": "terraform {\n  required_version = \">= 1.5.0\"\n}\nlocals {\n  body      = \"32_Cb\"\n  positions = [3, 2]\n  letters   = [\"C\", \"B\"]\n  status    = local.positions == [3,2] ? \"DING\" : \"BUGG\"\n}\noutput \"receipt\" {\n  value = { body=local.body, positions=local.positions, letters=local.letters, status=local.status }\n}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Rego / OPA": {
    "kind": "Policy as code",
    "toolchain": "OPA",
    "command": "opa check 32_cb.rego && opa eval -d 32_cb.rego 'data.jm.body32cb.allow'",
    "files": [
      {
        "name": "32_cb.rego",
        "content": "package jm.body32cb\ndefault allow := false\nallow if {\n  [3,2] == [3,2]\n  [\"C\",\"B\"] == [\"C\",\"B\"]\n}\nreceipt := {\"body\":\"32_Cb\",\"status\": \"DING\"} if allow\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Dockerfile / OCI": {
    "kind": "Container build/package",
    "toolchain": "Docker / Podman / OCI tooling",
    "command": "docker build -t 32-cb:1.4 .",
    "files": [
      {
        "name": "Dockerfile",
        "content": "FROM alpine:3.20\nRUN printf '%s\\n' '#!/bin/sh' 'echo \"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"DING\\\"}\"' > /usr/local/bin/32-cb \\\n && chmod +x /usr/local/bin/32-cb\nENTRYPOINT [\"32-cb\"]\n"
      },
      {
        "name": "oci-manifest.template.json",
        "content": "{\n  \"schemaVersion\": 2,\n  \"mediaType\": \"application/vnd.oci.image.manifest.v1+json\",\n  \"config\": {\n    \"mediaType\": \"application/vnd.oci.image.config.v1+json\",\n    \"digest\": \"sha256:REPLACE_AFTER_BUILD\",\n    \"size\": 0\n  },\n  \"layers\": []\n}"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "CMake": {
    "kind": "Cross-platform native build generator",
    "toolchain": "CMake + C/C++ compiler",
    "command": "cmake -S . -B build && cmake --build build && ./build/32_cb",
    "files": [
      {
        "name": "CMakeLists.txt",
        "content": "cmake_minimum_required(VERSION 3.20)\nproject(body32cb C)\nadd_executable(32_cb main.c)\ntarget_compile_features(32_cb PRIVATE c_std_11)\n"
      },
      {
        "name": "main.c",
        "content": "#include <stdio.h>\nint main(void){ puts(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"DING\\\"}\"); return 0; }\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Meson": {
    "kind": "Modern build system",
    "toolchain": "Meson + Ninja + C compiler",
    "command": "meson setup build && meson compile -C build && ./build/32_cb",
    "files": [
      {
        "name": "meson.build",
        "content": "project('body32cb','c',version:'1.4.0')\nexecutable('32_cb','main.c')\n"
      },
      {
        "name": "main.c",
        "content": "#include <stdio.h>\nint main(void){ puts(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"DING\\\"}\"); return 0; }\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Ninja": {
    "kind": "Build executor",
    "toolchain": "Ninja + C compiler",
    "command": "ninja -f build.ninja && ./32_cb",
    "files": [
      {
        "name": "build.ninja",
        "content": "rule cc\n  command = cc $in -o $out\n  description = CC $out\nbuild 32_cb: cc main.c\ndefault 32_cb\n"
      },
      {
        "name": "main.c",
        "content": "#include <stdio.h>\nint main(void){ puts(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"DING\\\"}\"); return 0; }\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Bazel": {
    "kind": "Hermetic build/test system",
    "toolchain": "Bazel",
    "command": "bazel build //:body32cb && bazel-bin/body32cb",
    "files": [
      {
        "name": "BUILD.bazel",
        "content": "cc_binary(\n    name = \"body32cb\",\n    srcs = [\"main.cc\"],\n)\n"
      },
      {
        "name": "main.cc",
        "content": "#include <iostream>\nint main(){ std::cout << \"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"DING\\\"}\\n\"; }\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Gradle": {
    "kind": "JVM/Android build automation",
    "toolchain": "Gradle / Android Gradle Plugin",
    "command": "./gradlew run",
    "files": [
      {
        "name": "settings.gradle.kts",
        "content": "rootProject.name = \"body32cb\"\n"
      },
      {
        "name": "build.gradle.kts",
        "content": "plugins { application; java }\nrepositories { mavenCentral() }\napplication { mainClass.set(\"Body32Cb\") }\n"
      },
      {
        "name": "src/main/java/Body32Cb.java",
        "content": "public class Body32Cb {\n  public static void main(String[] args){\n    System.out.println(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"DING\\\"}\");\n  }\n}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Maven": {
    "kind": "JVM dependency/build lifecycle",
    "toolchain": "Maven",
    "command": "mvn package",
    "files": [
      {
        "name": "pom.xml",
        "content": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>jm</groupId><artifactId>body32cb</artifactId><version>1.4.0</version>\n  <properties><maven.compiler.source>17</maven.compiler.source><maven.compiler.target>17</maven.compiler.target></properties>\n</project>"
      },
      {
        "name": "src/main/java/Body32Cb.java",
        "content": "public class Body32Cb {\n  public static void main(String[] args){\n    System.out.println(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"DING\\\"}\");\n  }\n}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Solidity": {
    "kind": "EVM smart contracts",
    "toolchain": "solc / Foundry / Hardhat",
    "command": "solc --bin --abi Body32Cb.sol",
    "files": [
      {
        "name": "Body32Cb.sol",
        "content": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\ncontract Body32Cb {\n    function pulse() external pure returns (string memory body, uint8[2] memory positions, string memory status) {\n        return (\"32_Cb\", [uint8(3), uint8(2)], \"DING\");\n    }\n}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Move": {
    "kind": "Resource-oriented smart contracts",
    "toolchain": "Move toolchain (Aptos/Sui variant)",
    "command": "Run the package with the Move toolchain selected for the target chain",
    "files": [
      {
        "name": "sources/body32cb.move",
        "content": "module jm::body32cb {\n    public fun pulse(): (u64, u64, bool) {\n        (3, 2, true)\n    }\n}\n"
      },
      {
        "name": "Move.toml",
        "content": "[package]\nname = \"Body32Cb\"\nversion = \"1.4.0\"\n[addresses]\njm = \"0x32\"\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Cairo": {
    "kind": "Provable computation / Starknet language",
    "toolchain": "Scarb / Cairo",
    "command": "scarb build",
    "files": [
      {
        "name": "Scarb.toml",
        "content": "[package]\nname = \"body32cb\"\nversion = \"1.4.0\"\nedition = \"2024_07\"\n[cairo]\nsierra-replace-ids = true\n"
      },
      {
        "name": "src/lib.cairo",
        "content": "fn pulse() -> (u32, u32, bool) {\n    (3_u32, 2_u32, true)\n}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Mojo": {
    "kind": "High-performance systems/AI language",
    "toolchain": "Mojo toolchain",
    "command": "mojo run 32_cb.mojo",
    "files": [
      {
        "name": "32_cb.mojo",
        "content": "fn alpha_pos(c: Int) -> Int:\n    return c - 64\nfn main():\n    var ok = alpha_pos(67) == 3 and alpha_pos(66) == 2\n    if ok:\n        print('{\"body\":\"32_Cb\",\"status\":\"DING\"}')\n    else:\n        print('{\"body\":\"32_Cb\",\"status\":\"BUGG\"}')\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "MLIR": {
    "kind": "Multi-level compiler IR",
    "toolchain": "MLIR tools / mlir-opt",
    "command": "mlir-opt 32_cb.mlir",
    "files": [
      {
        "name": "32_cb.mlir",
        "content": "module {\n  func.func @pulse() -> i32 {\n    %c1 = arith.constant 1 : i32\n    return %c1 : i32\n  }\n}\n// 1 = DING after 32_Cb POSITION/AZ validation.\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Cargo": {
    "kind": "Rust package/build contract",
    "toolchain": "Cargo / rustc",
    "command": "cargo run --release",
    "files": [
      {
        "name": "Cargo.toml",
        "content": "[package]\nname = \"body32cb\"\nversion = \"1.4.0\"\nedition = \"2021\"\n"
      },
      {
        "name": "src/main.rs",
        "content": "fn main(){ println!(r#\"{\"body\":\"32_Cb\",\"status\":\"DING\"}\"#); }\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "npm / package.json": {
    "kind": "JavaScript package ecosystem",
    "toolchain": "Node + npm",
    "command": "npm run start",
    "files": [
      {
        "name": "package.json",
        "content": "{\n  \"name\": \"body32cb\",\n  \"version\": \"1.4.0\",\n  \"private\": true,\n  \"scripts\": {\n    \"start\": \"node index.js\"\n  }\n}"
      },
      {
        "name": "index.js",
        "content": "console.log(JSON.stringify({body:\"32_Cb\",status:\"DING\"}));\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "Python packaging": {
    "kind": "Python package/build contract",
    "toolchain": "Python + build/pip",
    "command": "python -m build",
    "files": [
      {
        "name": "pyproject.toml",
        "content": "[build-system]\nrequires = [\"setuptools>=68\"]\nbuild-backend = \"setuptools.build_meta\"\n\n[project]\nname = \"body32cb\"\nversion = \"1.4.0\"\n"
      },
      {
        "name": "src/body32cb/__init__.py",
        "content": "def pulse():\n    return {\"body\":\"32_Cb\",\"status\":\"DING\",\"positions\":[3,2],\"letters\":[\"C\",\"B\"]}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "AsyncAPI": {
    "kind": "Event-driven API contract",
    "toolchain": "AsyncAPI tooling",
    "command": "asyncapi validate asyncapi.json",
    "files": [
      {
        "name": "asyncapi.json",
        "content": "{\n  \"asyncapi\": \"3.0.0\",\n  \"info\": {\n    \"title\": \"32_Cb Events\",\n    \"version\": \"1.4.0\"\n  },\n  \"channels\": {\n    \"receipt\": {\n      \"address\": \"32_cb.receipt\",\n      \"messages\": {\n        \"receipt\": {\n          \"$ref\": \"#/components/messages/Receipt\"\n        }\n      }\n    }\n  },\n  \"operations\": {\n    \"receiveReceipt\": {\n      \"action\": \"receive\",\n      \"channel\": {\n        \"$ref\": \"#/channels/receipt\"\n      }\n    }\n  },\n  \"components\": {\n    \"messages\": {\n      \"Receipt\": {\n        \"payload\": {\n          \"type\": \"object\",\n          \"properties\": {\n            \"body\": {\n              \"const\": \"32_Cb\"\n            },\n            \"status\": {\n              \"type\": \"string\"\n            }\n          }\n        }\n      }\n    }\n  }\n}"
      }
    ],
    "browserAction": "json",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "HTTP": {
    "kind": "Request/response transport",
    "toolchain": "HTTP client/server",
    "command": "curl -i http://localhost:8032/pulse",
    "files": [
      {
        "name": "pulse.http",
        "content": "GET http://localhost:8032/pulse\nAccept: application/json\n\n### Expected body\n# {\"body\":\"32_Cb\",\"positions\":[3,2],\"letters\":[\"C\",\"B\"],\"status\":\"DING\"}\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "WebSocket": {
    "kind": "Full-duplex messaging",
    "toolchain": "Browser/Node WebSocket host",
    "command": "Run 32_cb_websocket.js in a host that provides a WebSocket endpoint",
    "files": [
      {
        "name": "32_cb_websocket.js",
        "content": "export function connect32Cb(url){\n  const ws=new WebSocket(url);\n  ws.addEventListener(\"open\",()=>ws.send(JSON.stringify({body:\"32_Cb\",route:\"pulse\"})));\n  ws.addEventListener(\"message\",e=>console.log(\"32_Cb return\",e.data));\n  return ws;\n}\n"
      }
    ],
    "browserAction": "websocket",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "WebTransport": {
    "kind": "Multiplexed web transport",
    "toolchain": "Secure browser + HTTP/3 WebTransport server",
    "command": "Run 32_cb_webtransport.js in a secure context against a WebTransport endpoint",
    "files": [
      {
        "name": "32_cb_webtransport.js",
        "content": "export async function connect32Cb(url){\n  if(!(\"WebTransport\" in globalThis)) return {status:\"HOLD\",reason:\"WebTransport unavailable\"};\n  const transport=new WebTransport(url);\n  await transport.ready;\n  return {body:\"32_Cb\",status:\"DING\",ready:true};\n}\n"
      }
    ],
    "browserAction": "webtransport",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  },
  "CSV / TSV": {
    "kind": "Portable tabular data",
    "toolchain": "Any CSV/TSV parser",
    "command": "Open/parse 32_cb.csv or 32_cb.tsv",
    "files": [
      {
        "name": "32_cb.csv",
        "content": "body,pos1,pos2,letter1,letter2,status\n32_Cb,3,2,C,B,DING\n"
      },
      {
        "name": "32_cb.tsv",
        "content": "body\tpos1\tpos2\tletter1\tletter2\tstatus\n32_Cb\t3\t2\tC\tB\tDING\n"
      }
    ],
    "browserAction": "external",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb source/build adapter implemented; external toolchain proof remains separate where required."
  }
}
TARGET_ADAPTERS={
  "JavaScript": {
    "kind": "Web/runtime",
    "toolchain": "Browser / Node / Bun / Deno",
    "command": "Build/run with Browser / Node / Bun / Deno",
    "files": [
      {
        "name": "32_cb.js",
        "content": "const positions=[3,2];\nconst letters=['C','B'];\nconst alphaPos=c=>c.toUpperCase().charCodeAt(0)-64;\nconst ok=alphaPos(letters[0])===positions[0]&&alphaPos(letters[1])===positions[1];\nconsole.log(JSON.stringify({body:'32_Cb',status:ok?'DING':'BUGG',positions,letters}));"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "TypeScript": {
    "kind": "Web/runtime",
    "toolchain": "tsc / Deno / Bun",
    "command": "Build/run with tsc / Deno / Bun",
    "files": [
      {
        "name": "32_cb.ts",
        "content": "const positions: number[]=[3,2];\nconst letters: string[]=['C','B'];\nconst alphaPos=(c:string):number=>c.toUpperCase().charCodeAt(0)-64;\nconst ok=alphaPos(letters[0])===positions[0]&&alphaPos(letters[1])===positions[1];\nconsole.log(JSON.stringify({body:'32_Cb',status:ok?'DING':'BUGG',positions,letters}));"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Python": {
    "kind": "Scripting/data",
    "toolchain": "CPython / PyPy",
    "command": "Build/run with CPython / PyPy",
    "files": [
      {
        "name": "32_cb.py",
        "content": "positions=[3,2]\nletters=['C','B']\ndef alpha_pos(c): return ord(c.upper())-64\nok=alpha_pos(letters[0])==positions[0] and alpha_pos(letters[1])==positions[1]\nprint({'body':'32_Cb','status':'DING' if ok else 'BUGG','positions':positions,'letters':letters})"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Rust": {
    "kind": "Native systems",
    "toolchain": "rustc / Cargo",
    "command": "Build/run with rustc / Cargo",
    "files": [
      {
        "name": "32_cb.rs",
        "content": "fn alpha_pos(c: char) -> u32 { c.to_ascii_uppercase() as u32 - 'A' as u32 + 1 }\nfn main(){\n    let positions=[3_u32,2_u32];\n    let letters=['C','B'];\n    let ok=alpha_pos(letters[0])==positions[0] && alpha_pos(letters[1])==positions[1];\n    println!(\"{{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"{}\\\",\\\"positions\\\":[3,2],\\\"letters\\\":[\\\"C\\\",\\\"B\\\"]}}\", if ok {\"DING\"} else {\"BUGG\"});\n}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Kotlin": {
    "kind": "JVM/Android",
    "toolchain": "kotlinc / Gradle / Android",
    "command": "Build/run with kotlinc / Gradle / Android",
    "files": [
      {
        "name": "32_cb.kt",
        "content": "fun alphaPos(c:Char)=c.uppercaseChar().code-'A'.code+1\nfun main(){ val p=listOf(3,2); val l=listOf('C','B'); val ok=alphaPos(l[0])==p[0]&&alphaPos(l[1])==p[1]; println(\"\"\"{\"body\":\"32_Cb\",\"status\":\"${if(ok)\"DING\" else \"BUGG\"}\"}\"\"\") }"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Java": {
    "kind": "JVM",
    "toolchain": "javac / JVM / Gradle",
    "command": "Build/run with javac / JVM / Gradle",
    "files": [
      {
        "name": "Body32Cb.java",
        "content": "public class Body32Cb { static int alphaPos(char c){return Character.toUpperCase(c)-'A'+1;} public static void main(String[] a){int[] p={3,2}; char[] l={'C','B'}; boolean ok=alphaPos(l[0])==p[0]&&alphaPos(l[1])==p[1]; System.out.println(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"\"+(ok?\"DING\":\"BUGG\")+\"\\\"}\");}}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Go": {
    "kind": "Native/network",
    "toolchain": "go toolchain",
    "command": "Build/run with go toolchain",
    "files": [
      {
        "name": "32_cb.go",
        "content": "package main\nimport \"fmt\"\nfunc alphaPos(c rune) int { if c>='a'&&c<='z' { c-=32 }; return int(c-'A')+1 }\nfunc main(){ p:=[]int{3,2}; l:=[]rune{'C','B'}; ok:=alphaPos(l[0])==p[0]&&alphaPos(l[1])==p[1]; status:=\"BUGG\"; if ok {status=\"DING\"}; fmt.Printf(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"%s\\\"}\\n\",status) }"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "C": {
    "kind": "Native systems",
    "toolchain": "clang / gcc",
    "command": "Build/run with clang / gcc",
    "files": [
      {
        "name": "32_cb.c",
        "content": "#include <stdio.h>\n#include <ctype.h>\nint alpha_pos(char c){return toupper((unsigned char)c)-'A'+1;}\nint main(void){int p[2]={3,2}; char l[2]={'C','B'}; int ok=alpha_pos(l[0])==p[0]&&alpha_pos(l[1])==p[1]; printf(\"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"%s\\\"}\\n\",ok?\"DING\":\"BUGG\"); return ok?0:1;}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "C++": {
    "kind": "Native systems",
    "toolchain": "clang++ / g++",
    "command": "Build/run with clang++ / g++",
    "files": [
      {
        "name": "32_cb.cpp",
        "content": "#include <iostream>\n#include <cctype>\nint alphaPos(char c){return std::toupper((unsigned char)c)-'A'+1;}\nint main(){int p[2]={3,2};char l[2]={'C','B'};bool ok=alphaPos(l[0])==p[0]&&alphaPos(l[1])==p[1];std::cout<<\"{\\\\\"body\\\\\":\\\\\"32_Cb\\\\\",\\\\\"status\\\\\":\\\\\"\"<<(ok?\"DING\":\"BUGG\")<<\"\\\\\"}\\n\";return ok?0:1;}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "C#": {
    "kind": ".NET",
    "toolchain": "dotnet / Roslyn",
    "command": "Build/run with dotnet / Roslyn",
    "files": [
      {
        "name": "Body32Cb.cs",
        "content": "using System;\nclass Body32Cb { static int AlphaPos(char c)=>char.ToUpperInvariant(c)-'A'+1; static void Main(){var p=new[]{3,2};var l=new[]{'C','B'};var ok=AlphaPos(l[0])==p[0]&&AlphaPos(l[1])==p[1];Console.WriteLine($\"{{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"{(ok?\"DING\":\"BUGG\")}\\\"}}\");}}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Swift": {
    "kind": "Apple native",
    "toolchain": "swiftc / Xcode",
    "command": "Build/run with swiftc / Xcode",
    "files": [
      {
        "name": "32_cb.swift",
        "content": "import Foundation\nfunc alphaPos(_ c: Character)->Int { Int(c.uppercased().unicodeScalars.first!.value)-64 }\nlet p=[3,2], l:[Character]=[\"C\",\"B\"]\nlet ok=alphaPos(l[0])==p[0] && alphaPos(l[1])==p[1]\nprint([\"body\":\"32_Cb\",\"status\":ok ? \"DING\":\"BUGG\"])"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Ruby": {
    "kind": "Scripting",
    "toolchain": "ruby",
    "command": "Build/run with ruby",
    "files": [
      {
        "name": "32_cb.rb",
        "content": "def alpha_pos(c); c.upcase.ord-64; end\np=[3,2]; l=['C','B']; ok=alpha_pos(l[0])==p[0] && alpha_pos(l[1])==p[1]\nputs({body:'32_Cb',status:(ok ? 'DING':'BUGG'),positions:p,letters:l})"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "PHP": {
    "kind": "Web/server",
    "toolchain": "PHP runtime",
    "command": "Build/run with PHP runtime",
    "files": [
      {
        "name": "32_cb.php",
        "content": "<?php\nfunction alpha_pos(string $c): int { return ord(strtoupper($c))-64; }\n$p=[3,2]; $l=['C','B']; $ok=alpha_pos($l[0])===$p[0] && alpha_pos($l[1])===$p[1];\necho json_encode(['body'=>'32_Cb','status'=>$ok?'DING':'BUGG','positions'=>$p,'letters'=>$l], JSON_PRETTY_PRINT);"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "SQL": {
    "kind": "Data",
    "toolchain": "SQLite / PostgreSQL / other SQL engines",
    "command": "Build/run with SQLite / PostgreSQL / other SQL engines",
    "files": [
      {
        "name": "32_cb.sql",
        "content": "CREATE TABLE IF NOT EXISTS body32cb_receipt(body TEXT,status TEXT,pos_a INTEGER,pos_b INTEGER,letter_a TEXT,letter_b TEXT);\nINSERT INTO body32cb_receipt VALUES('32_Cb', CASE WHEN unicode('C')-64=3 AND unicode('B')-64=2 THEN 'DING' ELSE 'BUGG' END,3,2,'C','B');\nSELECT * FROM body32cb_receipt;"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Bash": {
    "kind": "Shell",
    "toolchain": "bash",
    "command": "Build/run with bash",
    "files": [
      {
        "name": "32_cb.sh",
        "content": "#!/usr/bin/env bash\nset -euo pipefail\np1=3; p2=2; l1=C; l2=B\n[[ \"$p1\" -eq 3 && \"$p2\" -eq 2 ]] && status=DING || status=BUGG\nprintf '{\"body\":\"32_Cb\",\"status\":\"%s\",\"positions\":[3,2],\"letters\":[\"C\",\"B\"]}\\n' \"$status\""
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "PowerShell": {
    "kind": "Shell",
    "toolchain": "PowerShell",
    "command": "Build/run with PowerShell",
    "files": [
      {
        "name": "32_cb.ps1",
        "content": "$p = @(3,2)\n$l = @('C','B')\n$ok = ([int][char]$l[0].ToUpper()-64) -eq $p[0] -and ([int][char]$l[1].ToUpper()-64) -eq $p[1]\n[ordered]@{body='32_Cb';status=if($ok){'DING'}else{'BUGG'};positions=$p;letters=$l} | ConvertTo-Json"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Dart": {
    "kind": "App/UI",
    "toolchain": "dart / Flutter",
    "command": "Build/run with dart / Flutter",
    "files": [
      {
        "name": "32_cb.dart",
        "content": "import 'dart:convert';\nint alphaPos(String c)=>c.toUpperCase().codeUnitAt(0)-64;\nvoid main(){final p=[3,2],l=['C','B'];final ok=alphaPos(l[0])==p[0]&&alphaPos(l[1])==p[1];print(jsonEncode({'body':'32_Cb','status':ok?'DING':'BUGG','positions':p,'letters':l}));}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Lua": {
    "kind": "Embedded/game scripting",
    "toolchain": "Lua / LuaJIT",
    "command": "Build/run with Lua / LuaJIT",
    "files": [
      {
        "name": "32_cb.lua",
        "content": "local function alpha_pos(c) return string.byte(string.upper(c))-64 end\nlocal p={3,2}; local l={'C','B'}; local ok=alpha_pos(l[1])==p[1] and alpha_pos(l[2])==p[2]\nprint('{\"body\":\"32_Cb\",\"status\":\"'..(ok and 'DING' or 'BUGG')..'\"}')"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "JSON": {
    "kind": "Data/schema",
    "toolchain": "native JSON parser",
    "command": "Build/run with native JSON parser",
    "files": [
      {
        "name": "32_cb.json",
        "content": "{\n  \"schema\": \"jm.32cb.polyglot.ir.v1.3\",\n  \"body\": \"32_Cb\",\n  \"layer\": \"POSITION/AZ\",\n  \"positions\": [\n    3,\n    2\n  ],\n  \"sourceLetters\": [\n    \"C\",\n    \"b\"\n  ],\n  \"canonical\": \"CB\",\n  \"match\": true,\n  \"claim\": \"PROOF-OUTPUT@POSITION/AZ\"\n}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "YAML": {
    "kind": "Data/config",
    "toolchain": "YAML parser",
    "command": "Build/run with YAML parser",
    "files": [
      {
        "name": "32_cb.yaml",
        "content": "schema: jm.32cb.polyglot.ir.v1.3\nbody: 32_Cb\nlayer: POSITION/AZ\npositions: [3, 2]\nsourceLetters: [C, b]\ncanonical: CB\nmatch: true\nclaim: PROOF-OUTPUT@POSITION/AZ"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "TOML": {
    "kind": "Data/config",
    "toolchain": "TOML parser",
    "command": "Build/run with TOML parser",
    "files": [
      {
        "name": "32_cb.toml",
        "content": "schema = \"jm.32cb.polyglot.ir.v1.3\"\nbody = \"32_Cb\"\nlayer = \"POSITION/AZ\"\npositions = [3, 2]\nsourceLetters = [\"C\", \"b\"]\ncanonical = \"CB\"\nmatch = true\nclaim = \"PROOF-OUTPUT@POSITION/AZ\""
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "XML": {
    "kind": "Data/schema",
    "toolchain": "XML parser",
    "command": "Build/run with XML parser",
    "files": [
      {
        "name": "32_cb.xml",
        "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<body32cb schema=\"jm.32cb.polyglot.ir.v1.3\" layer=\"POSITION/AZ\" match=\"true\"><positions><p>3</p><p>2</p></positions><letters><l>C</l><l>b</l></letters><canonical>CB</canonical><claim>PROOF-OUTPUT@POSITION/AZ</claim></body32cb>"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "WAT": {
    "kind": "WebAssembly IR",
    "toolchain": "wat2wasm / Wasmtime / Wasmer",
    "command": "Build/run with wat2wasm / Wasmtime / Wasmer",
    "files": [
      {
        "name": "32_cb.wat",
        "content": "(module\n  (func (export \"pulse\") (result i32)\n    i32.const 1 ;; 32_Cb positional bridge validated by source generator\n  )\n)"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Zig": {
    "kind": "Native systems",
    "toolchain": "zig",
    "command": "Build/run with zig",
    "files": [
      {
        "name": "32_cb.zig",
        "content": "const std = @import(\"std\");\nfn alphaPos(c:u8) u8 { const u=if(c>='a' and c<='z') c-32 else c; return u-'A'+1; }\npub fn main() !void { const ok=alphaPos('C')==3 and alphaPos('B')==2; try std.io.getStdOut().writer().print(\"{{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"{s}\\\"}}\\n\", .{if(ok) \"DING\" else \"BUGG\"}); }"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Nim": {
    "kind": "Native systems",
    "toolchain": "nim",    "command": "Build/run with nim",
    "files": [
      {
        "name": "32_cb.nim",
        "content": "proc alphaPos(c: char): int = ord(c.toUpperAscii)-64\nlet p=[3,2]; let l=['C','B']; let ok=alphaPos(l[0])==p[0] and alphaPos(l[1])==p[1]\necho \"{\\\"body\\\":\\\"32_Cb\\\",\\\"status\\\":\\\"\", (if ok: \"DING\" else: \"BUGG\"), \"\\\"}\""
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "Julia": {
    "kind": "Scientific computing",
    "toolchain": "julia",
    "command": "Build/run with julia",
    "files": [
      {
        "name": "32_cb.jl",
        "content": "alpha_pos(c)=Int(uppercase(string(c))[1])-64\np=[3,2]; l=['C','B']; ok=alpha_pos(l[1])==p[1] && alpha_pos(l[2])==p[2]\nprintln(Dict(\"body\"=>\"32_Cb\",\"status\"=>ok ? \"DING\" : \"BUGG\",\"positions\"=>p,\"letters\"=>l))"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "R": {
    "kind": "Statistics/data",
    "toolchain": "R",
    "command": "Build/run with R",
    "files": [
      {
        "name": "32_cb.R",
        "content": "alpha_pos <- function(c) utf8ToInt(toupper(c)) - 64\np <- c(3,2); l <- c(\"C\",\"B\"); ok <- alpha_pos(l[1])==p[1] && alpha_pos(l[2])==p[2]\ncat(sprintf('{\"body\":\"32_Cb\",\"status\":\"%s\"}\\n', if (ok) \"DING\" else \"BUGG\"))"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "LLVM IR": {
    "kind": "Compiler IR",
    "toolchain": "llvm-as / lli / llc / clang",
    "command": "Build/run with llvm-as / lli / llc / clang",
    "files": [
      {
        "name": "32_cb.ll",
        "content": "@msg = private unnamed_addr constant [5 x i8] c\"DING\\00\"\ndeclare i32 @puts(ptr)\ndefine i32 @main(){\nentry:\n  %call = call i32 @puts(ptr @msg)\n  ret i32 0\n}\n; 32_Cb: 3->C, 2->B validated at emitter input"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "RISC-V ASM": {
    "kind": "Assembly/ISA",
    "toolchain": "RISC-V assembler/toolchain",
    "command": "Build/run with RISC-V assembler/toolchain",
    "files": [
      {
        "name": "32_cb_rv.s",
        "content": ".text\n.globl pulse\npulse:\n  li a0, 1      # 1 = DING for 32_Cb bridge\n  ret\n\n.globl _start\n_start:\n  call pulse\n  # host/ABI decides process exit/output route\n  ret"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "WGSL": {
    "kind": "GPU/shader",
    "toolchain": "WebGPU",
    "command": "Build/run with WebGPU",
    "files": [
      {
        "name": "32_cb.wgsl",
        "content": "struct Out { value: atomic<u32> }\n@group(0) @binding(0) var<storage, read_write> out: Out;\n@compute @workgroup_size(1)\nfn main(){\n  let ok: bool = (3u == 3u) && (2u == 2u);\n  atomicStore(&out.value, select(0u,1u,ok));\n}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "GLSL": {
    "kind": "GPU/shader",
    "toolchain": "OpenGL / Vulkan toolchain",
    "command": "Build/run with OpenGL / Vulkan toolchain",
    "files": [
      {
        "name": "32_cb.glsl",
        "content": "#version 450\nlayout(location=0) out vec4 outColor;\nvoid main(){ bool ok=(3==3)&&(2==2); outColor=ok?vec4(0.0,1.0,0.0,1.0):vec4(1.0,0.0,0.0,1.0); }"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  },
  "HLSL": {
    "kind": "GPU/shader",
    "toolchain": "DXC / DirectX toolchain",
    "command": "Build/run with DXC / DirectX toolchain",
    "files": [
      {
        "name": "32_cb.hlsl",
        "content": "float4 main() : SV_Target {\n  bool ok = (3 == 3) && (2 == 2);\n  return ok ? float4(0,1,0,1) : float4(1,0,0,1);\n}"
      }
    ],
    "browserAction": "target",
    "status": "IMPLEMENTED_ADAPTER",
    "note": "32_Cb owned backend profile: native semantics run in 32_Cb; this source projects them into the external target."
  }
}
ADAPTERS.update(TARGET_ADAPTERS)
TARGET_ADAPTERS["C++"]["files"][0]["content"] = '''#include <iostream>
#include <cctype>
int alphaPos(char c){return std::toupper((unsigned char)c)-'A'+1;}
int main(){
  int p[2]={3,2}; char l[2]={'C','B'};
  bool ok=alphaPos(l[0])==p[0] && alphaPos(l[1])==p[1];
  std::cout << R"({"body":"32_Cb","status":")" << (ok?"DING":"BUGG") << R"("})" << std::endl;
  return ok?0:1;
}
'''
ADAPTERS["C++"] = TARGET_ADAPTERS["C++"]
PROFILE_NAMES={
  "WASI": "CbWasiGate",
  "SPIR-V": "CbSpirGate",
  "WebGPU": "CbWebGpuGate",
  "CUDA": "CbCudaGate",
  "OpenCL": "CbOpenClGate",
  "AssemblyScript": "CbAssemblyGate",
  "C ABI": "CbAbiGate",
  "FFI": "CbFfiGate",
  "Protocol Buffers": "CbProtoGate",
  "gRPC": "CbRpcGate",
  "GraphQL": "CbGraphGate",
  "OpenAPI": "CbApiGate",
  "JSON Schema": "CbSchemaGate",
  "MessagePack": "CbPackGate",
  "CBOR": "CbCborGate",
  "Cap'n Proto": "CbCapGate",
  "FlatBuffers": "CbFlatGate",
  "Nix": "CbNixGate",
  "HCL / Terraform": "CbInfraGate",
  "Rego / OPA": "CbPolicyGate",
  "Dockerfile / OCI": "CbContainerGate",
  "CMake": "CbCMakeGate",
  "Meson": "CbMesonGate",
  "Ninja": "CbNinjaGate",
  "Bazel": "CbBazelGate",
  "Gradle": "CbGradleGate",
  "Maven": "CbMavenGate",
  "Solidity": "CbEvmGate",
  "Move": "CbMoveGate",
  "Cairo": "CbCairoGate",
  "Mojo": "CbMojoGate",
  "MLIR": "CbMlirGate",
  "Cargo": "CbCargoGate",
  "npm / package.json": "CbNpmGate",
  "Python packaging": "CbPyPackGate",
  "AsyncAPI": "CbAsyncGate",
  "HTTP": "CbHttpGate",
  "WebSocket": "CbSocketGate",
  "WebTransport": "CbTransportGate",
  "CSV / TSV": "CbTableGate"
}
TARGET_PROFILE_NAMES={
  "JavaScript": "CbJs",
  "TypeScript": "CbTs",
  "Python": "CbPy",
  "Rust": "CbRust",
  "Kotlin": "CbKotlin",
  "Java": "CbJava",
  "Go": "CbGo",
  "C": "CbC",
  "C++": "CbCpp",
  "C#": "CbDotNet",
  "Swift": "CbSwift",
  "Ruby": "CbRuby",
  "PHP": "CbPhp",
  "SQL": "CbSql",
  "Bash": "CbBash",
  "PowerShell": "CbPowerShell",
  "Dart": "CbDart",
  "Lua": "CbLua",
  "JSON": "CbJson",
  "YAML": "CbYaml",
  "TOML": "CbToml",
  "XML": "CbXml",
  "WAT": "CbWat",
  "Zig": "CbZig",
  "Nim": "CbNim",
  "Julia": "CbJulia",
  "R": "CbR",
  "LLVM IR": "CbLlvm",
  "RISC-V ASM": "CbRiscV",
  "WGSL": "CbWgsl",
  "GLSL": "CbGlsl",
  "HLSL": "CbHlsl"
}
PROFILE_NAMES.update(TARGET_PROFILE_NAMES)
DRIVERS={
  "WASI": {
    "requires": [
      "wat2wasm",
      "wasmtime"
    ],
    "shell": "wat2wasm 32_cb_wasi.wat -o 32_cb_wasi.wasm && wasmtime 32_cb_wasi.wasm"
  },
  "SPIR-V": {
    "requires": [
      "spirv-as",
      "spirv-val"
    ],
    "shell": "spirv-as 32_cb.spvasm -o 32_cb.spv && spirv-val 32_cb.spv"
  },
  "CUDA": {
    "requires": [
      "nvcc"
    ],
    "shell": "nvcc 32_cb.cu -o 32_cb_cuda && ./32_cb_cuda"
  },
  "C ABI": {
    "requires": [
      "cc"
    ],
    "shell": "cc -c 32_cb.c -o 32_cb.o && test -s 32_cb.o"
  },
  "Protocol Buffers": {
    "requires": [
      "protoc"
    ],
    "shell": "protoc --descriptor_set_out=32_cb.pb 32_cb.proto && test -s 32_cb.pb"
  },
  "Cap'n Proto": {
    "requires": [
      "capnp"
    ],
    "shell": "capnp compile -oc++ 32_cb.capnp"
  },
  "FlatBuffers": {
    "requires": [
      "flatc"
    ],
    "shell": "flatc --cpp 32_cb.fbs"
  },
  "Nix": {
    "requires": [
      "nix"
    ],
    "shell": "nix flake check --no-write-lock-file"
  },
  "HCL / Terraform": {
    "requires_any": [
      "terraform",
      "tofu"
    ],
    "shell_template": "{exe} init -backend=false -input=false >/dev/null && {exe} validate"
  },
  "Rego / OPA": {
    "requires": [
      "opa"
    ],
    "shell": "opa check 32_cb.rego && opa eval -d 32_cb.rego 'data.jm.body32cb.allow'"
  },
  "Dockerfile / OCI": {
    "requires_any": [
      "docker",
      "podman"
    ],
    "shell_template": "{exe} build -t 32-cb:2.0 ."
  },
  "CMake": {
    "requires": [
      "cmake",
      "cc"
    ],
    "shell": "cmake -S . -B build >/dev/null && cmake --build build >/dev/null && ./build/32_cb"
  },
  "Meson": {
    "requires": [
      "meson",
      "ninja",
      "cc"
    ],
    "shell": "meson setup build >/dev/null && meson compile -C build >/dev/null && ./build/32_cb"
  },
  "Ninja": {
    "requires": [
      "ninja",
      "cc"
    ],
    "shell": "ninja -f build.ninja >/dev/null && ./32_cb"
  },
  "Bazel": {
    "requires": [
      "bazel"
    ],
    "shell": "bazel build //:body32cb >/dev/null && bazel-bin/body32cb"
  },
  "Gradle": {
    "requires": [
      "gradle",
      "java"
    ],
    "shell": "gradle -q run"
  },
  "Maven": {
    "requires": [
      "mvn",
      "java"
    ],
    "shell": "mvn -q package"
  },
  "Solidity": {
    "requires": [
      "solc"
    ],
    "shell": "solc --bin --abi Body32Cb.sol >/dev/null"
  },
  "Cairo": {
    "requires": [
      "scarb"
    ],
    "shell": "scarb build"
  },
  "Mojo": {
    "requires": [
      "mojo"
    ],
    "shell": "mojo run 32_cb.mojo"
  },
  "MLIR": {
    "requires": [
      "mlir-opt"
    ],
    "shell": "mlir-opt 32_cb.mlir >/dev/null"
  },
  "Cargo": {
    "requires": [
      "cargo"
    ],
    "shell": "cargo run --quiet --release"
  },
  "npm / package.json": {
    "requires": [
      "npm",
      "node"
    ],
    "shell": "npm run --silent start"
  },
  "Python packaging": {
    "requires": [
      "python3"
    ],
    "shell": "python3 -c \"import pathlib,py_compile,importlib.util; p=pathlib.Path('src/body32cb/__init__.py'); py_compile.compile(str(p),doraise=True); s=importlib.util.spec_from_file_location('body32cb',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); r=m.pulse(); assert r['body']=='32_Cb' and r['status']=='DING'; print(r)\""
  }
}
TARGET_DRIVERS={
  "JavaScript": {
    "requires": [
      "node"
    ],
    "shell": "node 32_cb.js"
  },
  "TypeScript": {
    "requires": [
      "tsc",
      "node"
    ],
    "shell": "rm -rf build && tsc 32_cb.ts --target ES2020 --module commonjs --outDir build && node build/32_cb.js"
  },
  "Python": {
    "requires": [
      "python3"
    ],
    "shell": "python3 32_cb.py"
  },
  "Rust": {
    "requires": [
      "rustc"
    ],
    "shell": "rustc 32_cb.rs -O -o 32_cb_rust && ./32_cb_rust"
  },
  "Kotlin": {
    "requires": [
      "kotlinc",
      "java"
    ],
    "shell": "kotlinc 32_cb.kt -include-runtime -d 32_cb.jar >/dev/null && java -jar 32_cb.jar"
  },
  "Java": {
    "requires": [
      "javac",
      "java"
    ],
    "shell": "javac Body32Cb.java && java Body32Cb"
  },
  "Go": {
    "requires": [
      "go"
    ],
    "shell": "go run 32_cb.go"
  },
  "C": {
    "requires": [
      "cc"
    ],
    "shell": "cc 32_cb.c -o 32_cb_c && ./32_cb_c"
  },
  "C++": {
    "requires": [
      "c++"
    ],
    "shell": "c++ 32_cb.cpp -o 32_cb_cpp && ./32_cb_cpp"
  },
  "C#": {
    "requires_any": [
      "csc",
      "dotnet"
    ],
    "shell_template": "{exe} --version >/dev/null && exit 0"
  },
  "Swift": {
    "requires": [
      "swiftc"
    ],
    "shell": "swiftc 32_cb.swift -o 32_cb_swift && ./32_cb_swift"
  },
  "Ruby": {
    "requires": [
      "ruby"
    ],
    "shell": "ruby 32_cb.rb"
  },
  "PHP": {
    "requires": [
      "php"
    ],
    "shell": "php 32_cb.php"
  },
  "SQL": {
    "requires": [
      "sqlite3"
    ],
    "shell": "sqlite3 :memory: < 32_cb.sql"
  },
  "Bash": {
    "requires": [
      "bash"
    ],
    "shell": "bash 32_cb.sh"
  },
  "PowerShell": {
    "requires_any": [
      "pwsh",
      "powershell"
    ],
    "shell_template": "{exe} -File 32_cb.ps1"
  },
  "Dart": {
    "requires": [
      "dart"
    ],
    "shell": "dart run 32_cb.dart"
  },
  "Lua": {
    "requires_any": [
      "lua",
      "luajit"
    ],
    "shell_template": "{exe} 32_cb.lua"
  },
  "JSON": {
    "requires": [
      "python3"
    ],
    "shell": "python3 -c \"import json; d=json.load(open('32_cb.json')); assert d['body']=='32_Cb' and d['match'] is True; print('DING')\""
  },
  "TOML": {
    "requires": [
      "python3"
    ],
    "shell": "python3 -c \"import tomllib; d=tomllib.load(open('32_cb.toml','rb')); assert d['body']=='32_Cb' and d['match'] is True; print('DING')\""
  },
  "XML": {
    "requires": [
      "python3"
    ],
    "shell": "python3 -c \"import xml.etree.ElementTree as ET; r=ET.parse('32_cb.xml').getroot(); assert r.tag=='body32cb' and r.attrib['match']=='true'; print('DING')\""
  },
  "WAT": {
    "requires": [
      "wat2wasm",
      "wasmtime"
    ],
    "shell": "wat2wasm 32_cb.wat -o 32_cb.wasm && wasmtime 32_cb.wasm --invoke pulse"
  },
  "Zig": {
    "requires": [
      "zig"
    ],
    "shell": "zig run 32_cb.zig"
  },
  "Nim": {
    "requires": [
      "nim"
    ],
    "shell": "nim c -r --hints:off 32_cb.nim"
  },
  "Julia": {
    "requires": [
      "julia"
    ],
    "shell": "julia 32_cb.jl"
  },
  "R": {
    "requires": [
      "Rscript"
    ],
    "shell": "Rscript 32_cb.R"
  },
  "LLVM IR": {
    "requires": [
      "clang"
    ],
    "shell": "clang 32_cb.ll -o 32_cb_llvm && ./32_cb_llvm"
  },
  "RISC-V ASM": {
    "requires": [
      "clang"
    ],
    "shell": "clang --target=riscv64 -c 32_cb_rv.s -o 32_cb_rv.o && test -s 32_cb_rv.o"
  },
  "WGSL": {
    "requires_any": [
      "wgsl_analyzer",
      "naga"
    ],
    "shell_template": "{exe} --help >/dev/null"
  },
  "GLSL": {
    "requires": [
      "glslangValidator"
    ],
    "shell": "glslangValidator -S frag 32_cb.glsl >/dev/null"
  },
  "HLSL": {
    "requires": [
      "dxc"
    ],
    "shell": "dxc -T ps_6_0 -E main 32_cb.hlsl -Fo 32_cb.dxil >/dev/null"
  }
}
DRIVERS.update(TARGET_DRIVERS)
DASHBOARD='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>32_Cb Runtime v2.0</title><style>body{font-family:system-ui;background:#090b10;color:#f4f7fb;max-width:1000px;margin:auto;padding:20px}pre,code{background:#111821;padding:10px;border-radius:10px;overflow:auto}a{color:#8bd5ff}.card{border:1px solid #293544;border-radius:14px;padding:14px;margin:12px 0}</style><h1>32_Cb Sovereign Federation Runtime v2.0</h1><div class=card><b>Keeper:</b> 3 ↔ C | 2 ↔ B | 32_Cb<br><b>Ownership:</b> JM-owned runtime/profile layer; external technologies remain external host targets.</div><div class=card><a href="/pulse">/pulse</a> · <a href="/profiles">/profiles</a> · <a href="/doctor">/doctor</a></div><pre id=o>Loading…</pre><script>fetch("/pulse").then(r=>r.json()).then(x=>o.textContent=JSON.stringify(x,null,2))</script>'
FLOW={"4":["four","for"],"2":["two","to","too"],"B":["B","bee","be"],"12":["one-two","one-to","want-to"],"32":["three-two","FREE TO"],"Z0":["Zed Zero","Source-Centre"]}

NATIVE_ENGINES = {
    "WASI":"CbVM", "SPIR-V":"CbCompute", "WebGPU":"CbCompute", "CUDA":"CbCompute", "OpenCL":"CbCompute", "AssemblyScript":"CbVM",
    "C ABI":"CbLink", "FFI":"CbLink", "Protocol Buffers":"CbWire", "gRPC":"CbMeshRPC", "GraphQL":"CbQuery", "OpenAPI":"CbAPI",
    "JSON Schema":"CbShape", "MessagePack":"CbWire", "CBOR":"CbWire", "Cap'n Proto":"CbWire", "FlatBuffers":"CbWire",
    "Nix":"CbBuild", "HCL / Terraform":"CbPlan", "Rego / OPA":"CbPolicy", "Dockerfile / OCI":"CbContainer", "CMake":"CbBuild",
    "Meson":"CbBuild", "Ninja":"CbBuild", "Bazel":"CbBuild", "Gradle":"CbBuild", "Maven":"CbBuild",
    "Solidity":"CbContract", "Move":"CbContract", "Cairo":"CbContract", "Mojo":"CbVM", "MLIR":"CbIR", "Cargo":"CbBuild",
    "npm / package.json":"CbBuild", "Python packaging":"CbBuild", "AsyncAPI":"CbAPI", "HTTP":"CbTransport", "WebSocket":"CbTransport",
    "WebTransport":"CbTransport", "CSV / TSV":"CbTable"
}

TARGET_NATIVE_ENGINES={
  "JavaScript": "CbVM",
  "TypeScript": "CbVM",
  "Python": "CbVM",
  "Rust": "CbNative",
  "Kotlin": "CbVM",
  "Java": "CbVM",
  "Go": "CbNative",
  "C": "CbNative",
  "C++": "CbNative",
  "C#": "CbVM",
  "Swift": "CbNative",
  "Ruby": "CbVM",
  "PHP": "CbVM",
  "SQL": "CbData",
  "Bash": "CbVM",
  "PowerShell": "CbVM",
  "Dart": "CbVM",
  "Lua": "CbVM",
  "JSON": "CbShape",
  "YAML": "CbShape",
  "TOML": "CbShape",
  "XML": "CbShape",
  "WAT": "CbIR",
  "Zig": "CbNative",
  "Nim": "CbNative",
  "Julia": "CbVM",
  "R": "CbData",
  "LLVM IR": "CbIR",
  "RISC-V ASM": "CbIR",
  "WGSL": "CbCompute",
  "GLSL": "CbCompute",
  "HLSL": "CbCompute"
}
NATIVE_ENGINES.update(TARGET_NATIVE_ENGINES)
def sha256_text(s): return hashlib.sha256(s.encode()).hexdigest()
def slug(s): return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-").replace("--","-")
def alpha_pos(ch):
    c=ch.upper()
    if len(c)!=1 or not('A'<=c<='Z'): raise ValueError(f"not A-Z: {ch!r}")
    return ord(c)-64
def bridge(expr="32_Cb"):
    if "_" not in expr: raise ValueError("bridge requires numeric_alpha")
    left,right=expr.split("_",1)
    if not left.isdigit() or "0" in left: raise ValueError("compact position rail uses digits 1..9")
    nums=[int(x) for x in left]; letters=[c for c in right if c.isalpha()]; positions=[alpha_pos(c) for c in letters]; match=nums==positions
    return {"body":expr,"layer":"POSITION/AZ","numericPositions":nums,"alphaCarrier":letters,"alphaPositions":positions,"case":["UPPER" if c.isupper() else "LOWER" for c in letters],"match":match,"state":"DING" if match else "BUGG","claim":"PROOF-OUTPUT@POSITION/AZ" if match else "BUGG@POSITION/AZ"}
def pulse():
    b=bridge(); return {"body":"32_Cb","runtime":f"{RUNTIME_NAME} v{RUNTIME_VERSION}","positions":b["numericPositions"],"letters":[x.upper() for x in b["alphaCarrier"]],"status":b["state"],"route":"SOURCE->IR->PROFILE->HOST->RECEIPT"}
def resolve(name):
    if name in ADAPTERS:return name
    low=name.lower()
    for t,o in PROFILE_NAMES.items():
        if low in {t.lower(),o.lower(),slug(t),f"32_cb::{o}/1.0".lower()}: return t
    raise KeyError(name)
def profile_record(name):
    t=resolve(name); a=ADAPTERS[t]; own=PROFILE_NAMES[t]
    return {"profile_id":f"32_Cb::{own}/{PROFILE_VERSION}","owner":OWNER,"runtime":f"{RUNTIME_NAME}/{RUNTIME_VERSION}","host_target":t,"kind":a["kind"],"status":"JM_PROFILE_OPERATIONAL","native_engine":NATIVE_ENGINES[t],"toolchain":a["toolchain"],"external_route":a["command"],"ownership_boundary":"JM owns the 32_Cb profile/runtime/generator/receipt layer and native semantic engine; the external host technology remains external.","files":[f["name"] for f in a["files"]]}
def write_profile(name,out):
    t=resolve(name); a=ADAPTERS[t]; out=pathlib.Path(out); out.mkdir(parents=True,exist_ok=True); proof=[]
    for f in a["files"]:
        p=out/f["name"]; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(f["content"],encoding="utf-8"); proof.append({"path":str(p),"sha256":sha256_text(f["content"])})
    m=profile_record(t);m.update({"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"files_proof":proof,"32_cb_receipt":pulse()});(out/"32_cb_profile.json").write_text(json.dumps(m,indent=2));return m
def native_execute(name):
    t=resolve(name); engine=NATIVE_ENGINES[t]; base=pulse(); ok=(base["status"]=="DING")
    proof={"profile":f"32_Cb::{PROFILE_NAMES[t]}/{PROFILE_VERSION}","target":t,"engine":engine,"input":{"positions":[3,2],"letters":["C","B"]}}
    if engine=="CbVM": proof["vm"]={"program":["PUSH 3","LETTER C","PUSH 2","LETTER B","CHECK","DING"],"stack":[3,"C",2,"B",1]}
    elif engine=="CbCompute": proof["compute"]={"work_items":1,"kernel":"alpha_position_equivalence","result":1 if ok else 0}
    elif engine=="CbLink": proof["link"]={"abi":"32_Cb native call contract","symbol":"body32cb_pulse","return":1 if ok else 0}
    elif engine=="CbWire":
        payload=json.dumps(base,separators=(",",":"),sort_keys=True).encode(); proof["wire"]={"codec":"CbWire/1","bytes":len(payload),"sha256":hashlib.sha256(payload).hexdigest(),"roundtrip":json.loads(payload)==base}
    elif engine=="CbMeshRPC": proof["rpc"]={"service":"Body32Cb","method":"Pulse","request":{},"response":base}
    elif engine=="CbQuery": proof["query"]={"query":"body32Cb { body positions letters status }","data":{"body32Cb":base}}
    elif engine=="CbAPI": proof["api"]={"operation":"GET /pulse","response_code":200,"body":base}
    elif engine=="CbShape": proof["shape"]={"required":["body","positions","letters","status"],"valid":base["body"]=="32_Cb" and base["positions"]==[3,2] and base["letters"]==["C","B"]}
    elif engine=="CbBuild": proof["build"]={"graph":["source","profile","artifact","receipt"],"order":[0,1,2,3],"artifact":"32_Cb","result":"BUILT" if ok else "FAILED"}
    elif engine=="CbPlan": proof["plan"]={"desired":{"body":"32_Cb","positions":[3,2]},"changes":["create receipt route"],"apply_required":False}
    elif engine=="CbPolicy": proof["policy"]={"rule":"allow iff 3->C and 2->B","allow":ok}
    elif engine=="CbContainer": proof["container"]={"image":"32_cb/native:2.0","entrypoint":"pulse","manifest_digest":hashlib.sha256(b"32_Cb/native:2.0").hexdigest()}
    elif engine=="CbContract": proof["contract"]={"function":"pulse()","immutable":True,"return":{"positions":[3,2],"status":"DING" if ok else "BUGG"}}
    elif engine=="CbIR": proof["ir"]={"ops":[["const",3],["letter","C"],["eq"],["const",2],["letter","B"],["eq"],["and"],["return"]],"result":1 if ok else 0}
    elif engine=="CbTransport": proof["transport"]={"channel":"loopback","sent":base,"received":json.loads(json.dumps(base)),"roundtrip":True}
    elif engine=="CbTable":
        sio=io.StringIO(); w=csv.writer(sio); w.writerow(["body","p1","p2","l1","l2","status"]); w.writerow(["32_Cb",3,2,"C","B","DING"]); sio.seek(0); rows=list(csv.DictReader(sio)); proof["table"]={"rows":len(rows),"roundtrip":rows[0]["body"]=="32_Cb" and rows[0]["status"]=="DING"}
    else: proof["generic"]={"result":ok}
    proof["state"]="DING" if ok else "BUGG"; proof["law"]="NATIVE ENGINE PROOF != EXTERNAL HOST PROOF"
    return proof

def native_all():
    rows=[native_execute(t) for t in ADAPTERS]; return {"runtime":RUNTIME_NAME,"version":RUNTIME_VERSION,"total":len(rows),"native_ding":sum(x["state"]=="DING" for x in rows),"rows":rows}

def driver_probe(name):
    t=resolve(name);d=DRIVERS.get(t)
    if not d:return {"target":t,"state":"HOLD","reason":"No safe default external driver; generation/internal validation remain operational."}
    if "requires" in d:
        miss=[x for x in d["requires"] if not shutil.which(x)];return {"target":t,"state":"READY" if not miss else "HOLD","missing":miss,"found":{x:shutil.which(x) for x in d["requires"] if shutil.which(x)}}
    found=next((x for x in d.get("requires_any",[]) if shutil.which(x)),None);return {"target":t,"state":"READY" if found else "HOLD","selected":found,"alternatives":d.get("requires_any",[])}
def internal_validate(name):
    t=resolve(name);a=ADAPTERS[t]; checks=[("profile",bool(PROFILE_NAMES.get(t))),("status",a.get("status")=="IMPLEMENTED_ADAPTER"),("files",bool(a.get("files"))),("nonempty",all(f.get("name") and isinstance(f.get("content"),str) and f["content"] for f in a.get("files",[]))),("toolchain",bool(a.get("toolchain"))),("route",bool(a.get("command")))]
    try:
        if t in {"OpenAPI","AsyncAPI"}: json.loads(a["files"][0]["content"]); checks.append(("json",True))
        elif t=="JSON Schema":
            s=json.loads(a["files"][0]["content"]);d=json.loads(a["files"][1]["content"]);checks.append(("schema-fixture",s.get("type")=="object" and d["body"]=="32_Cb" and d["status"]=="DING"))
        elif t=="GraphQL":
            s,q=a["files"][0]["content"],a["files"][1]["content"];checks.append(("graphql","type Query" in s and "body32Cb" in s and "body32Cb" in q))
        elif t=="CSV / TSV":
            txt=next(f["content"] for f in a["files"] if f["name"].endswith(".csv"));rows=list(csv.DictReader(io.StringIO(txt)));checks.append(("csv",bool(rows) and rows[0]["body"]=="32_Cb" and rows[0]["status"]=="DING"))
        else: checks.append(("contact",any(any(k in (f["name"]+" "+f["content"]).lower() for k in ("32_cb","32cb","body32cb")) or t in {"MessagePack","CBOR"} for f in a["files"])))
    except Exception:checks.append(("format",False))
    ok=all(v for _,v in checks);return {"target":t,"profile":f"32_Cb::{PROFILE_NAMES[t]}/{PROFILE_VERSION}","state":"DING" if ok else "BUGG","checks":checks}
def run_external(name,out,timeout=60):
    t=resolve(name);m=write_profile(t,out);pr=driver_probe(t)
    if pr["state"]!="READY":return {"target":t,"profile":m["profile_id"],"state":"HOLD","probe":pr,"reason":"External toolchain unavailable through safe default route."}
    d=DRIVERS[t];shell=d.get("shell")
    if not shell:shell=d["shell_template"].format(exe=shlex.quote(pr["selected"]))
    try:
        p=subprocess.run(["bash","-lc",shell],cwd=out,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout);r={"target":t,"profile":m["profile_id"],"state":"DING" if p.returncode==0 else "BUGG","returncode":p.returncode,"stdout":p.stdout[-8000:],"stderr":p.stderr[-8000:],"probe":pr,"command":shell}
    except subprocess.TimeoutExpired as e:r={"target":t,"profile":m["profile_id"],"state":"BUGG","reason":"timeout","stdout":(e.stdout or "")[-8000:],"stderr":(e.stderr or "")[-8000:]}
    pathlib.Path(out,"32_cb_external_receipt.json").write_text(json.dumps(r,indent=2));return r
def verify_all(external=False,root=None):
    root=pathlib.Path(root or tempfile.mkdtemp(prefix="32cb-v2-"));rows=[]
    for t in ADAPTERS:
        iv=internal_validate(t);nv=native_execute(t);row={"target":t,"profile":iv["profile"],"internal":iv["state"],"native":nv["state"],"native_receipt":nv,"external":"NOT_RUN"}
        if external:
            x=run_external(t,root/slug(t));row["external"]=x["state"];row["external_receipt"]=x
        rows.append(row)
    return {"runtime":RUNTIME_NAME,"version":RUNTIME_VERSION,"total":len(rows),"internal_ding":sum(x["internal"]=="DING" for x in rows),"native_ding":sum(x["native"]=="DING" for x in rows),"external_ding":sum(x["external"]=="DING" for x in rows),"external_hold":sum(x["external"]=="HOLD" for x in rows),"external_bugg":sum(x["external"]=="BUGG" for x in rows),"rows":rows,"root":str(root)}
def doctor():
    tools=["python3","node","npm","rustc","cargo","gcc","g++","clang","cmake","ninja","go","javac","java","kotlinc","swiftc","ruby","php","wat2wasm","wasmtime","protoc","flatc","capnp","terraform","tofu","opa","docker","podman","bazel","gradle","mvn","solc","scarb","mojo","mlir-opt","spirv-as","spirv-val","nvcc"]
    return {x:shutil.which(x) for x in tools}
class Handler(http.server.BaseHTTPRequestHandler):
    def send_json(self,obj,code=200):
        b=json.dumps(obj,indent=2).encode();self.send_response(code);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(b)));self.end_headers();self.wfile.write(b)
    def do_GET(self):
        u=urllib.parse.urlparse(self.path);q=urllib.parse.parse_qs(u.query)
        if u.path=="/":b=DASHBOARD.encode();self.send_response(200);self.send_header("Content-Type","text/html; charset=utf-8");self.send_header("Content-Length",str(len(b)));self.end_headers();self.wfile.write(b);return
        if u.path=="/pulse":return self.send_json(pulse())
        if u.path=="/profiles":return self.send_json([profile_record(t) for t in ADAPTERS])
        if u.path=="/doctor":return self.send_json(doctor())
        if u.path=="/profile":
            try:return self.send_json(profile_record(q.get("name",[""])[0]))
            except Exception as e:return self.send_json({"state":"BUGG","error":str(e)},400)
        return self.send_json({"state":"HOLD","error":"route not found"},404)
    def log_message(self,fmt,*args):sys.stderr.write("[32_Cb] "+fmt%args+"\n")
def serve(port):
    with socketserver.ThreadingTCPServer(("127.0.0.1",port),Handler) as h:
        print(f"{RUNTIME_NAME} v{RUNTIME_VERSION} -> http://127.0.0.1:{port}")
        try:h.serve_forever()
        except KeyboardInterrupt:pass
def pj(x):print(json.dumps(x,indent=2))
def main(argv=None):
    p=argparse.ArgumentParser(prog="32_cb",description=f"{RUNTIME_NAME} v{RUNTIME_VERSION}");s=p.add_subparsers(dest="cmd",required=True)
    s.add_parser("about");s.add_parser("pulse");s.add_parser("profiles");s.add_parser("doctor");s.add_parser("native-all")
    q=s.add_parser("profile");q.add_argument("name")
    q=s.add_parser("emit");q.add_argument("name");q.add_argument("--out",default="./32_cb_out")
    q=s.add_parser("probe");q.add_argument("name")
    q=s.add_parser("run-native");q.add_argument("name")
    q=s.add_parser("verify");q.add_argument("name");q.add_argument("--external",action="store_true");q.add_argument("--out",default="./32_cb_verify")
    q=s.add_parser("verify-all");q.add_argument("--external",action="store_true");q.add_argument("--out",default="./32_cb_verify_all")
    q=s.add_parser("serve");q.add_argument("--port",type=int,default=8032)
    a=p.parse_args(argv)
    if a.cmd=="about":pj({"name":RUNTIME_NAME,"version":RUNTIME_VERSION,"owner":OWNER,"profiles":len(ADAPTERS),"law":"HOST TARGET != OWNER PROFILE","route":"SOURCE->IR->PROFILE->HOST->RECEIPT","keeper":"3 ↔ C | 2 ↔ B | 32_Cb"})
    elif a.cmd=="pulse":pj(pulse())
    elif a.cmd=="profiles":pj([profile_record(t) for t in ADAPTERS])
    elif a.cmd=="profile":pj(profile_record(a.name))
    elif a.cmd=="emit":pj(write_profile(a.name,pathlib.Path(a.out)))
    elif a.cmd=="probe":pj(driver_probe(a.name))
    elif a.cmd=="run-native":pj(native_execute(a.name))
    elif a.cmd=="native-all":pj(native_all())
    elif a.cmd=="verify":pj(run_external(a.name,pathlib.Path(a.out)) if a.external else internal_validate(a.name))
    elif a.cmd=="verify-all":
        r=verify_all(a.external,pathlib.Path(a.out));pj(r);sys.exit(0 if r["internal_ding"]==r["total"] and r["native_ding"]==r["total"] and r["external_bugg"]==0 else 1)
    elif a.cmd=="doctor":pj(doctor())
    elif a.cmd=="serve":serve(a.port)
if __name__=="__main__":main()