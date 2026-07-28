/* RouteOS Kernel Convergence v0.1
 * JM-native operating logic on a freestanding x86-64 machine floor.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#define COM1 0x3F8
#define IDT_SIZE 256
#define USER1_CODE 0x02000000ULL
#define USER1_STACK_PAGE 0x02001000ULL
#define USER1_STACK_TOP 0x02002000ULL
#define USER2_CODE 0x02004000ULL
#define USER2_STACK_PAGE 0x02005000ULL
#define USER2_STACK_TOP 0x02006000ULL
#define USER_DATA_SELECTOR 0x1B
#define USER_CODE_SELECTOR 0x23
#define TSS_SELECTOR 0x28
#define SYS_TRACE_READ 1
#define SYS_YIELD 2
#define SYS_ROUTE_STATE 3

extern uint64_t boot_pml4[];
extern uint64_t boot_pdpt[];
extern uint64_t boot_pd[];
extern uint64_t boot_pts[];
extern uint8_t routeos_user1_blob_start[];
extern uint8_t routeos_user1_blob_end[];
extern uint8_t routeos_user2_blob_start[];
extern uint8_t routeos_user2_blob_end[];
extern char routeos_generated_body1_source_sha[];
extern char routeos_generated_body1_ir_sha[];
extern char routeos_generated_body2_source_sha[];
extern char routeos_generated_body2_ir_sha[];
extern void routeos_isr_ud(void);
extern void routeos_isr_timer(void);
extern void routeos_isr_syscall(void);
extern void routeos_load_gdt(const void *ptr);
extern void routeos_load_tr(uint16_t selector);
extern void routeos_reload_cr3(void);
extern __attribute__((noreturn)) void routeos_enter_frame(void *frame);

static inline void outb(uint16_t port, uint8_t value) { __asm__ volatile("outb %0, %1" : : "a"(value), "Nd"(port)); }
static inline uint8_t inb(uint16_t port) { uint8_t value; __asm__ volatile("inb %1, %0" : "=a"(value) : "Nd"(port)); return value; }
static inline void io_wait(void) { outb(0x80, 0); }
static void *jm_memcpy(void *dst, const void *src, size_t n) { uint8_t *d=dst; const uint8_t *s=src; for(size_t i=0;i<n;++i)d[i]=s[i]; return dst; }
static void *jm_memset(void *dst, int value, size_t n) { uint8_t *d=dst; for(size_t i=0;i<n;++i)d[i]=(uint8_t)value; return dst; }

static void serial_init(void) { outb(COM1+1,0); outb(COM1+3,0x80); outb(COM1,3); outb(COM1+1,0); outb(COM1+3,3); outb(COM1+2,0xC7); outb(COM1+4,0x0B); }
static void serial_char(char c) { while ((inb(COM1+5)&0x20)==0){} outb(COM1,(uint8_t)c); }
static void serial_write(const char *s) { while(*s){ if(*s=='\n')serial_char('\r'); serial_char(*s++); } }
static void serial_u64(uint64_t value) { char b[21]; size_t i=0; if(!value){serial_char('0');return;} while(value&&i<sizeof(b)){b[i++]=(char)('0'+value%10);value/=10;} while(i)serial_char(b[--i]); }
static void receipt(const char *message) { serial_write("[JM] "); serial_write(message); serial_write("\n"); }

#define HEAP_BLOCKS 16
#define HEAP_BLOCK_SIZE 256
static uint8_t heap[HEAP_BLOCKS][HEAP_BLOCK_SIZE] __attribute__((aligned(16)));
static bool heap_used[HEAP_BLOCKS];
static void *memory_allocate(void){for(size_t i=0;i<HEAP_BLOCKS;++i)if(!heap_used[i]){heap_used[i]=true;return heap[i];}return NULL;}
static bool memory_release(void *p){for(size_t i=0;i<HEAP_BLOCKS;++i)if(p==heap[i]&&heap_used[i]){heap_used[i]=false;return true;}return false;}

struct __attribute__((packed)) gdtr { uint16_t limit; uint64_t base; };
struct __attribute__((packed)) tss64 { uint32_t reserved0; uint64_t rsp0,rsp1,rsp2; uint64_t reserved1; uint64_t ist1,ist2,ist3,ist4,ist5,ist6,ist7; uint64_t reserved2; uint16_t reserved3; uint16_t iomap_base; };
static uint64_t gdt[7] __attribute__((aligned(16)));
static struct tss64 tss;
static uint8_t interrupt_stack[32768] __attribute__((aligned(16)));
static void gdt_install(void){
  jm_memset(gdt,0,sizeof(gdt)); gdt[1]=0x00AF9A000000FFFFULL; gdt[2]=0x00AF92000000FFFFULL; gdt[3]=0x00AFF2000000FFFFULL; gdt[4]=0x00AFFA000000FFFFULL;
  jm_memset(&tss,0,sizeof(tss)); tss.rsp0=(uint64_t)(interrupt_stack+sizeof(interrupt_stack)); tss.iomap_base=sizeof(tss);
  uint64_t base=(uint64_t)&tss,limit=sizeof(tss)-1,low=0; low|=(limit&0xFFFFULL); low|=(base&0xFFFFFFULL)<<16; low|=0x89ULL<<40; low|=((limit>>16)&0xFULL)<<48; low|=((base>>24)&0xFFULL)<<56;
  gdt[5]=low; gdt[6]=base>>32; struct gdtr ptr={.limit=sizeof(gdt)-1,.base=(uint64_t)gdt}; routeos_load_gdt(&ptr); routeos_load_tr(TSS_SELECTOR);
}

struct __attribute__((packed)) idt_entry { uint16_t offset_low,selector; uint8_t ist,type_attr; uint16_t offset_mid; uint32_t offset_high,zero; };
struct __attribute__((packed)) idtr { uint16_t limit; uint64_t base; };
static struct idt_entry idt[IDT_SIZE] __attribute__((aligned(16)));
static void idt_set(uint8_t vector,void(*handler)(void),uint8_t attr){uint64_t p=(uint64_t)handler;idt[vector].offset_low=(uint16_t)p;idt[vector].selector=0x08;idt[vector].ist=0;idt[vector].type_attr=attr;idt[vector].offset_mid=(uint16_t)(p>>16);idt[vector].offset_high=(uint32_t)(p>>32);idt[vector].zero=0;}
static void idt_install(void){jm_memset(idt,0,sizeof(idt));idt_set(6,routeos_isr_ud,0x8E);idt_set(32,routeos_isr_timer,0x8E);idt_set(128,routeos_isr_syscall,0xEE);struct idtr ptr={.limit=sizeof(idt)-1,.base=(uint64_t)idt};__asm__ volatile("lidt %0"::"m"(ptr));}
static void pic_pit_install(void){uint8_t a1=inb(0x21),a2=inb(0xA1);outb(0x20,0x11);io_wait();outb(0xA0,0x11);io_wait();outb(0x21,0x20);io_wait();outb(0xA1,0x28);io_wait();outb(0x21,0x04);io_wait();outb(0xA1,0x02);io_wait();outb(0x21,0x01);io_wait();outb(0xA1,0x01);io_wait();outb(0x21,(uint8_t)(a1&~1U));outb(0xA1,a2);uint16_t divisor=1193182U/100U;outb(0x43,0x36);outb(0x40,divisor&0xFF);outb(0x40,divisor>>8);}

struct cpu_frame { uint64_t r15,r14,r13,r12,r11,r10,r9,r8; uint64_t rsi,rdi,rbp,rdx,rcx,rbx,rax; uint64_t vector,error; uint64_t rip,cs,rflags,rsp,ss; };
enum body_state { BODY_READY,BODY_RUNNING,BODY_BLOCKED };
struct body { uint64_t id; enum body_state state; struct cpu_frame frame; uint64_t runs; };
static struct body bodies[2]; static int current_body=-1; static uint64_t ticks; static uint64_t routeos_state;
static struct cpu_frame *select_next(void){for(size_t attempt=0;attempt<2;++attempt){int candidate=(current_body+1+(int)attempt)%2;if(bodies[candidate].state!=BODY_BLOCKED){current_body=candidate;bodies[candidate].state=BODY_RUNNING;bodies[candidate].runs++;return &bodies[candidate].frame;}}receipt("FAULTHOLD: NO RUNNABLE BODY");for(;;){__asm__ volatile("cli; hlt");}}
static void save_current(struct cpu_frame *frame){if(current_body>=0&&bodies[current_body].state!=BODY_BLOCKED){jm_memcpy(&bodies[current_body].frame,frame,sizeof(*frame));bodies[current_body].state=BODY_READY;}}

struct cpu_frame *routeos_interrupt_dispatch(struct cpu_frame *frame){
  if(frame->vector==32){++ticks;outb(0x20,0x20);save_current(frame);if((ticks%25)==0){serial_write("[JM] TIMER TICK ");serial_u64(ticks);serial_write(" -> ROUTESCHEDULER\n");}return select_next();}
  if(frame->vector==128){save_current(frame);struct body *active=current_body>=0?&bodies[current_body]:NULL;if(!active)return select_next();
    if(active->frame.rax==SYS_TRACE_READ){serial_write("[JM] GENERATED USER BODY ");serial_u64(active->id);serial_write(" -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN\n");active->frame.rax=ticks;active->state=BODY_READY;return &active->frame;}
    if(active->frame.rax==SYS_YIELD){active->state=BODY_READY;return select_next();}
    if(active->frame.rax==SYS_ROUTE_STATE){routeos_state=active->frame.rdi;serial_write("[JM] GENERATED USER BODY ");serial_u64(active->id);serial_write(" -> SYSTEM CALL ROUTE_STATE -> PERMISSIONGATE PASS -> ROUTEOS STATE ");serial_u64(routeos_state);serial_write(" -> KERNEL RETURN\n");active->frame.rax=routeos_state;active->state=BODY_READY;return &active->frame;}
    receipt("PERMISSIONGATE DENY: UNKNOWN SYSTEM CALL");active->frame.rax=(uint64_t)-1;active->state=BODY_READY;return &active->frame;
  }
  if(frame->vector==6){save_current(frame);if(current_body>=0){serial_write("[JM] FAULTHOLD: GENERATED USER BODY ");serial_u64(bodies[current_body].id);serial_write(" INVALID OPCODE CAUGHT\n");bodies[current_body].state=BODY_BLOCKED;receipt("RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES");}return select_next();}
  receipt("FAULTHOLD: UNHANDLED VECTOR");return frame;
}

static void mark_user_page(uint64_t address){size_t pde=(size_t)(address>>21),pte=(size_t)(address>>12);boot_pml4[0]|=0x4;boot_pdpt[0]|=0x4;boot_pd[pde]|=0x4;boot_pts[pte]|=0x4;}
static void user_boundary_install(void){
  mark_user_page(USER1_CODE);mark_user_page(USER1_STACK_PAGE);mark_user_page(USER2_CODE);mark_user_page(USER2_STACK_PAGE);routeos_reload_cr3();
  size_t s1=(size_t)(routeos_user1_blob_end-routeos_user1_blob_start),s2=(size_t)(routeos_user2_blob_end-routeos_user2_blob_start);
  jm_memcpy((void*)USER1_CODE,routeos_user1_blob_start,s1);jm_memcpy((void*)USER2_CODE,routeos_user2_blob_start,s2);jm_memset((void*)USER1_STACK_PAGE,0,4096);jm_memset((void*)USER2_STACK_PAGE,0,4096);
  jm_memset(bodies,0,sizeof(bodies));bodies[0].id=1;bodies[0].state=BODY_READY;bodies[1].id=2;bodies[1].state=BODY_READY;
  bodies[0].frame.r12=1;bodies[0].frame.rip=USER1_CODE;bodies[0].frame.cs=USER_CODE_SELECTOR;bodies[0].frame.rflags=0x202;bodies[0].frame.rsp=USER1_STACK_TOP;bodies[0].frame.ss=USER_DATA_SELECTOR;
  bodies[1].frame.r12=2;bodies[1].frame.rip=USER2_CODE;bodies[1].frame.cs=USER_CODE_SELECTOR;bodies[1].frame.rflags=0x202;bodies[1].frame.rsp=USER2_STACK_TOP;bodies[1].frame.ss=USER_DATA_SELECTOR;
}

__attribute__((noreturn)) void routeos_kernel_entry(uint32_t magic,uint32_t mb_info){
  (void)mb_info;serial_init();receipt("JM BOOT IMAGE LOADED");if(magic!=0x36D76289U)receipt("BOOTROUTE HOLD: MULTIBOOT2 MAGIC MISMATCH");receipt("ROUTEOS KERNEL ENTRY");receipt("PRIVILEGED EXECUTION ACTIVE");
  void *probe=memory_allocate();if(probe&&memory_release(probe))receipt("MEMORY INITIALISED: ALLOCATE/RELEASE PASS");else receipt("MEMORY HOLD");
  gdt_install();idt_install();user_boundary_install();pic_pit_install();receipt("INTERRUPT ROUTE ACTIVE");receipt("BODYREGISTRY: TWO GENERATED USER BODIES REGISTERED");
  serial_write("[JM] ONEBODY GENERATED USER BODY 1 LOADED: SOURCE_SHA256 ");serial_write(routeos_generated_body1_source_sha);serial_write(" IR_SHA256 ");serial_write(routeos_generated_body1_ir_sha);serial_write("\n");
  serial_write("[JM] ONEBODY GENERATED USER BODY 2 LOADED: SOURCE_SHA256 ");serial_write(routeos_generated_body2_source_sha);serial_write(" IR_SHA256 ");serial_write(routeos_generated_body2_ir_sha);serial_write("\n");
  receipt("PERMISSIONGATE: INT 0x80 CONTROLLED ENTRY ACTIVE");receipt("DEVICE OUTPUT: JM-CONTROLLED SERIAL ACTIVE");receipt("ROUTESCHEDULER: ENTERING USER BODY 1");current_body=0;bodies[0].state=BODY_RUNNING;routeos_enter_frame(&bodies[0].frame);
}
