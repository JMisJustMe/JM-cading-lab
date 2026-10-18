typedef unsigned char UINT8;
typedef unsigned short UINT16;
typedef unsigned int UINT32;
typedef unsigned long long UINT64;
typedef unsigned long long UINTN;
typedef UINT64 EFI_STATUS;
typedef void *EFI_HANDLE;
typedef void *EFI_EVENT;
typedef UINT16 CHAR16;

#if defined(__x86_64__)
#define EFIAPI __attribute__((ms_abi))
#else
#define EFIAPI
#endif

#define EFI_SUCCESS 0ULL
#define EFI_NOT_READY 0x8000000000000006ULL

typedef struct {
    UINT64 Signature;
    UINT32 Revision;
    UINT32 HeaderSize;
    UINT32 CRC32;
    UINT32 Reserved;
} EFI_TABLE_HEADER;

typedef struct {
    UINT16 ScanCode;
    CHAR16 UnicodeChar;
} EFI_INPUT_KEY;

struct EFI_SIMPLE_TEXT_INPUT_PROTOCOL;
struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL;

typedef EFI_STATUS (EFIAPI *EFI_INPUT_RESET)(struct EFI_SIMPLE_TEXT_INPUT_PROTOCOL *, UINT8);
typedef EFI_STATUS (EFIAPI *EFI_INPUT_READ_KEY)(struct EFI_SIMPLE_TEXT_INPUT_PROTOCOL *, EFI_INPUT_KEY *);

typedef struct EFI_SIMPLE_TEXT_INPUT_PROTOCOL {
    EFI_INPUT_RESET Reset;
    EFI_INPUT_READ_KEY ReadKeyStroke;
    EFI_EVENT WaitForKey;
} EFI_SIMPLE_TEXT_INPUT_PROTOCOL;

typedef EFI_STATUS (EFIAPI *EFI_TEXT_RESET)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, UINT8);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_STRING)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, CHAR16 *);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_TEST_STRING)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, CHAR16 *);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_QUERY_MODE)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, UINTN, UINTN *, UINTN *);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_SET_MODE)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, UINTN);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_SET_ATTRIBUTE)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, UINTN);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_CLEAR_SCREEN)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_SET_CURSOR_POSITION)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, UINTN, UINTN);
typedef EFI_STATUS (EFIAPI *EFI_TEXT_ENABLE_CURSOR)(struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *, UINT8);

typedef struct EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL {
    EFI_TEXT_RESET Reset;
    EFI_TEXT_STRING OutputString;
    EFI_TEXT_TEST_STRING TestString;
    EFI_TEXT_QUERY_MODE QueryMode;
    EFI_TEXT_SET_MODE SetMode;
    EFI_TEXT_SET_ATTRIBUTE SetAttribute;
    EFI_TEXT_CLEAR_SCREEN ClearScreen;
    EFI_TEXT_SET_CURSOR_POSITION SetCursorPosition;
    EFI_TEXT_ENABLE_CURSOR EnableCursor;
    void *Mode;
} EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL;

typedef struct {
    EFI_TABLE_HEADER Hdr;
    CHAR16 *FirmwareVendor;
    UINT32 FirmwareRevision;
    EFI_HANDLE ConsoleInHandle;
    EFI_SIMPLE_TEXT_INPUT_PROTOCOL *ConIn;
    EFI_HANDLE ConsoleOutHandle;
    EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *ConOut;
    EFI_HANDLE StandardErrorHandle;
    EFI_SIMPLE_TEXT_OUTPUT_PROTOCOL *StdErr;
    void *RuntimeServices;
    void *BootServices;
    UINTN NumberOfTableEntries;
    void *ConfigurationTable;
} EFI_SYSTEM_TABLE;

static void out(EFI_SYSTEM_TABLE *st, CHAR16 *s) {
    if (st && st->ConOut && st->ConOut->OutputString) {
        st->ConOut->OutputString(st->ConOut, s);
    }
}

EFI_STATUS EFIAPI efi_main(EFI_HANDLE image, EFI_SYSTEM_TABLE *st) {
    (void)image;
    if (!st || !st->ConOut) return 1ULL;

    if (st->ConOut->ClearScreen) st->ConOut->ClearScreen(st->ConOut);
    out(st, L"JM ROUTECORE PHYSICAL CONTACT GATE v0.1\r\n");
    out(st, L"UEFI FIRMWARE ENTRY CONTACT\r\n");
    out(st, L"PARENT: PRE-BOOT v1.0 / UEFI TARGET v0.1\r\n");
    out(st, L"CLAIM: firmware app execution only; kernel/IRQ/device contact OPEN\r\n\r\n");
    out(st, L"Press any key to prove firmware keyboard contact...\r\n");

    if (st->ConIn && st->ConIn->ReadKeyStroke) {
        EFI_INPUT_KEY key;
        for (;;) {
            EFI_STATUS r = st->ConIn->ReadKeyStroke(st->ConIn, &key);
            if (r == EFI_SUCCESS) {
                out(st, L"UEFI KEYBOARD PROTOCOL CONTACT\r\n");
                out(st, L"SAFE RETURN TO FIRMWARE\r\n");
                out(st, L"Press a second key to return...\r\n");
                if (st->ConIn->Reset) st->ConIn->Reset(st->ConIn, 0);
                for (;;) {
                    r = st->ConIn->ReadKeyStroke(st->ConIn, &key);
                    if (r == EFI_SUCCESS) return EFI_SUCCESS;
                    if (r != EFI_NOT_READY) return r;
                    __asm__ volatile("pause");
                }
            }
            if (r != EFI_NOT_READY) {
                out(st, L"UEFI KEYBOARD PROTOCOL ERROR\r\n");
                return r;
            }
            __asm__ volatile("pause");
        }
    } else {
        out(st, L"UEFI KEYBOARD PROTOCOL UNAVAILABLE\r\n");
    }

    return EFI_SUCCESS;
}
