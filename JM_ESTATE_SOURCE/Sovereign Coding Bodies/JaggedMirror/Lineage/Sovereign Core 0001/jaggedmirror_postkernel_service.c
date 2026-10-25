#include <stdio.h>
#include <stdint.h>
#include <string.h>

typedef enum { JM_READY=0, JM_ROUTING=1, JM_FAULT_HOLD=2, JM_RECOVERED=3 } jm_state;
typedef struct { const char *kernel_gate; uint32_t lite_bodies; uint32_t domains; jm_state state; uint32_t receipts; } jm_core;
static int permission_gate(const char *route){ return route && (strcmp(route,"SUMMON")==0 || strcmp(route,"REFLECT")==0 || strcmp(route,"CAST")==0 || strcmp(route,"TRACE")==0); }
static int route_scheduler(jm_core *core,const char *route){ if(!core||!permission_gate(route)){ if(core) core->state=JM_FAULT_HOLD; return 0; } core->state=JM_ROUTING; core->receipts++; core->state=JM_READY; return 1; }
static void recovery_body(jm_core *core){ if(core&&core->state==JM_FAULT_HOLD){ core->state=JM_RECOVERED; core->receipts++; } }
int main(void){ jm_core core={"ROUTEOS GENERATED KERNEL DING: PASS",1358u,14u,JM_READY,0u}; int ok=route_scheduler(&core,"REFLECT"); int blocked=route_scheduler(&core,"UNKNOWN"); recovery_body(&core); printf("JAGGEDMIRROR_POST_KERNEL gate=%s bodies=%u domains=%u reflect=%d blocked=%d state=%d receipts=%u\n",core.kernel_gate,core.lite_bodies,core.domains,ok,blocked,(int)core.state,core.receipts); return (ok==1&&blocked==0&&core.state==JM_RECOVERED)?0:1; }