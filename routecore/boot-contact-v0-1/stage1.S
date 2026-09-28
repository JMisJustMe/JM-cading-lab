.code16
.section .text
.global _start
_start:
    cli
    xor %ax,%ax
    mov %ax,%ds
    mov %ax,%es
    mov %ax,%ss
    mov $0x7C00,%sp
    sti
    mov %dl,boot_drive

    /* BIOS EDD extended read: kernel from LBA 1 -> 0x1000:0000 (0x10000) */
    mov $0x42,%ah
    mov boot_drive,%dl
    mov $dap,%si
    int $0x13
    jc disk_error

    cli
    /* Fast A20 */
    in $0x92,%al
    or $0x02,%al
    out %al,$0x92

    lgdt gdt_desc
    mov %cr0,%eax
    or $1,%eax
    mov %eax,%cr0
    ljmp $0x08,$pm_entry

disk_error:
    mov $'E',%al
    mov $0x0E,%ah
    int $0x10
1:  hlt
    jmp 1b

.align 4
dap:
    .byte 0x10
    .byte 0
    .word 7
    .word 0x0000
    .word 0x1000
    .quad 1

boot_drive:
    .byte 0

.align 8
gdt:
    .quad 0x0000000000000000
    .quad 0x00CF9A000000FFFF
    .quad 0x00CF92000000FFFF
gdt_end:
gdt_desc:
    .word gdt_end-gdt-1
    .long gdt

.code32
pm_entry:
    mov $0x10,%ax
    mov %ax,%ds
    mov %ax,%es
    mov %ax,%ss
    mov $0x90000,%esp
    mov $0x10000,%eax
    jmp *%eax

.org 510
.word 0xAA55
