#!/usr/bin/env python3
from pathlib import Path
import shutil, sys
HERE=Path(__file__).resolve().parent
WORK=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()

def must_replace(s,a,b,label):
    if a not in s: raise SystemExit(f'missing transform anchor: {label}')
    return s.replace(a,b,1)

p=WORK/'kernel64.c'; s=p.read_text()
s=must_replace(s,'#define JM_AHCI_TIMEOUT 2000000u\n#define JM_AHCI_MMIO_VA 0x3F000000ULL\n#define JM_AHCI_SHARED_PT_PA 0x00074000ULL\n#define JM_AHCI_MMIO_PAGES 2u\n','#define JM_VIRTIO_TIMEOUT 2000000u\n#define JM_VIRTIO_VENDOR 0x1AF4u\n#define JM_VIRTIO_BLK_LEGACY_DEVICE 0x1001u\n#define JM_VIRTIO_BLK_F_FLUSH 9u\n#define JM_VIRTQ_MAX 128u\n','carrier constants')
s=must_replace(s,'static inline uint8_t inb(uint16_t p){uint8_t r;__asm__ volatile("inb %1, %0":"=a"(r):"Nd"(p));return r;}\n','static inline uint8_t inb(uint16_t p){uint8_t r;__asm__ volatile("inb %1, %0":"=a"(r):"Nd"(p));return r;}\nstatic inline uint16_t inw(uint16_t p){uint16_t r;__asm__ volatile("inw %1, %0":"=a"(r):"Nd"(p));return r;}\nstatic inline void outw(uint16_t p,uint16_t v){__asm__ volatile("outw %0, %1"::"a"(v),"Nd"(p));}\n','legacy virtio word io')
s=must_replace(s,'pd[1]=pt_pa|JM_PTE_P|JM_PTE_RW|JM_PTE_US;pd[504]=JM_AHCI_SHARED_PT_PA|JM_PTE_P|JM_PTE_RW;pt[0]=','pd[1]=pt_pa|JM_PTE_P|JM_PTE_RW|JM_PTE_US;pt[0]=','remove ahci shared mapping')
a=s.index('struct route_block_device{'); b=s.index('\nstruct route_cache_line',a)
s=s[:a]+(HERE/'virtio_driver.cfrag').read_text().rstrip('\n')+s[b:]
for old,new in [('ahci_reads','virtio_reads'),('ahci_writes','virtio_writes'),('ahci_flushes','virtio_flushes'),('ahci_timeouts','virtio_timeouts'),('ahci_errors','virtio_errors'),('route_ahci_reads','route_virtio_reads'),('route_ahci_writes','route_virtio_writes'),('route_ahci_flushes','route_virtio_flushes'),('route_ahci_timeouts','route_virtio_timeouts'),('route_ahci_errors','route_virtio_errors'),('route_ahci_init()','route_virtio_init()'),('JM_AHCI_IDENTIFY_READY','JM_VIRTIO_BLK_READY'),('JM ROUTECORE NATIVE64 AHCI v0.14','JM ROUTECORE NATIVE64 VIRTIO v0.15')]:
    s=s.replace(old,new)
p.write_text(s)

p=WORK/'stage2.S'; s=p.read_text()
s=must_replace(s,'    /* Shared supervisor AHCI MMIO PT: PDE[504] -> VA 0x3F000000. */\n    movl $0x74003, 0x72FC0\n    movl $0x00000000, 0x72FC4\n\n','','stage2 ahci pde')
p.write_text(s)

p=WORK/'build.py'; s=p.read_text()
s=s.replace("DISK_SECTORS=2048  # 1 MiB outer carrier; q35 boot-sector court requires >= 0x7e000 bytes","DISK_SECTORS=2048  # inherited 1 MiB boot carrier\nDATA_SECTORS=2048  # separate 1 MiB virtio-blk data carrier")
s=s.replace("VERSION='0.14'","VERSION='0.15'").replace("BODY='JM RouteCore Native64 AHCI Storage Carrier Gate'","BODY='JM RouteCore Native64 Virtio Block Storage Carrier Gate'")
s=s.replace('jm_routecore_native64_v0_14.elf','jm_routecore_native64_v0_15.elf').replace('boot payload overlaps ATA storage region','boot payload overlaps reserved LBA boundary')
s=s.replace('jm_routecore_native64_ahci_v0_14.img','jm_routecore_native64_virtio_blk_v0_15.img').replace('jm_routecore_native64_ahci_v0_14.rebuild.img','jm_routecore_native64_virtio_blk_v0_15.rebuild.img')
s=s.replace("'JM_AHCI_PCI_DISCOVERED','JM_AHCI_PORT_READY','JM_AHCI_IDENTIFY_READY','JM_AHCI_READ_CONTACT','JM_AHCI_WRITE_CONTACT','JM_AHCI_FLUSH_CONTACT'","'JM_VIRTIO_BLK_PCI_DISCOVERED','JM_VIRTIO_BLK_QUEUE_READY','JM_VIRTIO_BLK_READY','JM_VIRTIO_BLK_READ_CONTACT','JM_VIRTIO_BLK_WRITE_CONTACT','JM_VIRTIO_BLK_FLUSH_CONTACT'")
s=must_replace(s,'h2=sha(p2)\n',"h2=sha(p2)\ndata_seed=BUILD/'jm_routecore_native64_virtio_blk_v0_15.data.img'\ndata_seed.write_bytes(b'\\0'*(DATA_SECTORS*512))\ndata_seed_sha=sha(data_seed)\n",'data seed')
start=s.index("'ahci_pci_config_io':"); end=s.index("'block_cache_four_lines':",start)
checks="""'virtio_pci_config_io':all(x in csrc for x in ['0xCF8u','0xCFCu','route_pci_read32','route_pci_write16']),
'virtio_legacy_device_discovery':'route_virtio_find' in nm and 'JM_VIRTIO_VENDOR 0x1AF4u' in csrc and 'JM_VIRTIO_BLK_LEGACY_DEVICE 0x1001u' in csrc,
'virtio_io_bar':'route_pci_read32((uint8_t)b,(uint8_t)d,(uint8_t)f,0x10u)' in csrc and '(bar&1u)==0u' in csrc and 'bar&0xFFFCu' in csrc,
'virtio_pci_io_busmaster_enable':'|0x0005u' in csrc and 'route_pci_write16' in csrc,
'virtio_legacy_status_handshake':all(x in csrc for x in ['io+0x12u),0u','io+0x12u),1u','io+0x12u),3u','io+0x12u),7u']),
'virtio_feature_negotiation':'route_virtio_features=inl((uint16_t)(io+0x00u))' in csrc and 'outl((uint16_t)(io+0x04u),route_virtio_guest_features)' in csrc,
'virtio_flush_feature':'JM_VIRTIO_BLK_F_FLUSH 9u' in csrc and '1u<<JM_VIRTIO_BLK_F_FLUSH' in csrc,
'virtio_queue_select_size':'outw((uint16_t)(io+0x0Eu),0u)' in csrc and 'route_virtio_qsz=inw((uint16_t)(io+0x0Cu))' in csrc,
'virtio_queue_pfn':'outl((uint16_t)(io+0x08u),(uint32_t)((uint64_t)route_virtq_mem>>12))' in csrc,
'virtio_queue_4k_alignment':'route_virtq_mem[8192]' in csrc and 'aligned(4096)' in csrc,
'virtio_queue_bounded':'JM_VIRTQ_MAX 128u' in csrc and 'route_virtio_qsz>JM_VIRTQ_MAX' in csrc,
'virtio_descriptor_shape':'struct route_virtq_desc' in csrc and 'uint64_t addr;uint32_t len;uint16_t flags,next' in csrc,
'virtio_request_shape':'struct route_virtio_blk_req' in csrc and 'uint32_t type,reserved;uint64_t sector' in csrc,
'virtio_read_request':'route_virtio_read' in nm and 'route_virtio_submit(0u,lba,out,0,1)' in csrc,
'virtio_write_request':'route_virtio_write' in nm and 'route_virtio_submit(1u,lba,(void*)in,1,1)' in csrc,
'virtio_flush_request':'route_virtio_flush' in nm and 'route_virtio_submit(4u,0,(void*)0,0,0)' in csrc,
'virtio_queue_notify':'outw((uint16_t)(route_virtio_io+0x10u),0u)' in csrc,
'virtio_used_completion':'used[1]!=old_used' in csrc and 'route_virtio_status!=0u' in csrc,
'virtio_timeout_bounded':'JM_VIRTIO_TIMEOUT 2000000u' in csrc and 'route_virtio_timeouts++' in csrc,
'virtio_capacity_gate':'route_virtio_capacity_lo=inl((uint16_t)(io+0x14u))' in csrc and 'cap<(uint64_t)JM_BLOCK_DEVICE_BASE_LBA+JM_BLOCK_DEVICE_BLOCKS' in csrc,
'virtio_reserved_region_nonboot':'JM_BLOCK_DEVICE_BASE_LBA 256u' in csrc and sectors < BLOCK_BASE_LBA,
'virtio_boot_disk_extent':p1.stat().st_size==DISK_SECTORS*512,
'virtio_separate_data_extent':data_seed.stat().st_size==DATA_SECTORS*512,
'virtio_data_seed_zeroed':set(data_seed.read_bytes()) <= {0},
'no_ahci_carrier':'route_ahci_' not in csrc and 'JM_AHCI_' not in csrc,
'no_ata_pio_carrier':'JM_ATA_IO' not in csrc and 'route_ata_read' not in csrc,
'no_ramblk_carrier':'route_ramblk' not in csrc and 'JM_RAMBLK_BLOCKS' not in csrc,
'block_device_callbacks_bound':'route_block0={JM_BLOCK_SIZE,JM_BLOCK_DEVICE_BLOCKS,route_virtio_read,route_virtio_write}' in csrc,
"""
s=s[:start]+checks+s[end:]
s=s.replace("'parent':'JM RouteCore Native64 ATA PIO Storage Contact v0.13'","'parent':'JM RouteCore Native64 AHCI Storage Contact v0.14'")
s=s.replace("'route':'JM BIOS -> x86-64 -> W^X Ring-3 -> process -> VFS -> blockfs -> write-back cache -> generic block-device interface -> PCI-discovered AHCI SATA controller -> reserved on-disk LBA region -> DMA EXT -> flush -> raw sector reread -> user verification -> normal exit/reclaim'","'route':'JM BIOS boot carrier -> x86-64 -> W^X Ring-3 -> process -> VFS -> blockfs -> write-back cache -> generic block-device interface -> PCI legacy virtio-blk -> separate data carrier -> virtqueue request/completion -> flush -> generic-device reread -> user verification -> normal exit/reclaim'")
s=s.replace("'claim_scope':'compile/link/static construction proof for an AHCI/SATA carrier beneath the already-proved generic block-device contract: PCI class discovery, BAR5 MMIO mapping through a shared supervisor page table, SATA-port detection, AHCI command-list/FIS/table setup, IDENTIFY, one-sector READ DMA EXT / WRITE DMA EXT, FLUSH CACHE EXT, bounded command completion/error polling, the same reserved non-boot 32-sector region at LBA 256, and unchanged cache/BlockFS/VFS/process semantics. Actual AHCI controller execution and persistence remain OPEN until QEMU serial and raw-disk evidence return.'","'claim_scope':'compile/link/static construction proof for a legacy PCI virtio-blk carrier beneath the already-proved generic block-device contract: PCI vendor/device discovery, I/O BAR transport, bounded legacy status/feature negotiation, queue-0 PFN setup, one-outstanding-request virtqueue descriptors, one-sector IN/OUT, FLUSH, bounded used-ring completion/error polling, a separate 1 MiB data carrier with the same logical 32-sector region at LBA 256, and unchanged cache/BlockFS/VFS/process semantics. Actual virtio device execution and persistence remain OPEN until QEMU serial and raw-data-disk evidence return.'")
for old,new in [("'ahci_pci_discovered_observed':False","'virtio_pci_discovered_observed':False"),("'ahci_port_ready_observed':False","'virtio_queue_ready_observed':False"),("'ahci_identify_observed':False","'virtio_ready_observed':False"),("'ahci_read_observed':False","'virtio_read_observed':False"),("'ahci_write_observed':False","'virtio_write_observed':False"),("'ahci_flush_observed':False","'virtio_flush_observed':False")]:
    s=s.replace(old,new)
s=s.replace("'next_gate':'Execute the raw disk under QEMU q35/AHCI. Crown v0.14 only if PCI AHCI discovery and SATA-port readiness return, IDENTIFY succeeds, sectors are read through AHCI, task1 writes all 22 bytes through unchanged VFS/cache/BlockFS to the AHCI-backed data LBA, FLUSH CACHE EXT completes, direct generic-device reread verifies backing bytes, cache invalidation forces a later AHCI reload, Ring-3 verifies the bytes, process exit/reclaim still completes, and boot 2 mounts the existing filesystem.'","'next_gate':'Execute with a separate legacy virtio-blk data disk. Crown v0.15 only if PCI discovery, queue readiness, sector return, 22-byte persistence, flush, generic backing reread, cache invalidation/reload, Ring-3 verification, process reclaim, and boot-2 existing mount all return.'")
s=s.replace("'next_build_frontier':'No richer filesystem work is required to test this carrier. First prove the same upper storage body over AHCI. After AHCI two-boot persistence, compare carrier independence and then choose richer allocation/directories or physical-owner-device contact.'","'next_build_frontier':'After a third carrier passes, compare carrier independence and then choose NVMe, richer filesystem allocation/directories, or physical-owner-device contact.'")
s=s.replace("'keeper':'STORAGE IS A ROUTE, NOT A BYTE ARRAY. VFS/BlockFS/cache stay above the device boundary; AHCI is a replaceable carrier below it. ONE UPPER ROUTE, MULTIPLE CARRIERS. SOURCE CONSTRUCTION IS NOT DEVICE CONTACT. NO RETURNED SECTOR, NO DING.'","'keeper':'STORAGE IS A ROUTE, NOT A BYTE ARRAY. ONE UPPER ROUTE, MULTIPLE CARRIERS. CARRIER SWAP != FILESYSTEM REBUILD. SOURCE CONSTRUCTION IS NOT DEVICE CONTACT. NO RETURNED SECTOR, NO DING.'")
s=s.replace("proof_path=ROOT/'JM_ROUTECORE_NATIVE64_AHCI_v0_14_PROOF.json'","proof_path=ROOT/'JM_ROUTECORE_NATIVE64_VIRTIO_BLK_v0_15_PROOF.json'")
s=s.replace("'schema':'jm.routecore.native64-ahci/0.14'","'schema':'jm.routecore.native64-virtio-blk/0.15'").replace("'carrier':'PCI-discovered AHCI/SATA'","'carrier':'PCI legacy virtio-blk (transitional/legacy I/O transport)'").replace("'qemu_machine':'q35'","'qemu_machine':'pc'")
s=s.replace("'disk_bytes':p1.stat().st_size,","'boot_disk_bytes':p1.stat().st_size,\n  'data_disk_bytes':data_seed.stat().st_size,\n  'data_disk_seed_sha256':data_seed_sha,")
p.write_text(s)

for name in ['VERIFY_RUNTIME.py','INSPECT_VIRTIO_DISK.py','RUN_PERSISTENCE_LINUX.sh']:
    shutil.copy2(HERE/name,WORK/name)
print('v0.15 descendant transform applied')
