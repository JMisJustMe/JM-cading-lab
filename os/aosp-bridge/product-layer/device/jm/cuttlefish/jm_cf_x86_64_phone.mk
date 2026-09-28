# JM Android-derived OS — Cuttlefish x86_64 product v0.7
#
# AOSP remains the declared upstream platform. This product inherits the verified
# Android 17 Cuttlefish x86_64-only phone definition and adds a minimal JM-owned
# identity/provenance carrier. No upstream file is modified.

$(call inherit-product, device/google/cuttlefish/vsoc_x86_64_only/phone/aosp_cf.mk)

PRODUCT_NAME := jm_cf_x86_64_phone
PRODUCT_DEVICE := vsoc_x86_64_only
PRODUCT_BRAND := JM
PRODUCT_MANUFACTURER := JM
PRODUCT_MODEL := JM Android-derived Cuttlefish x86_64 phone

PRODUCT_COPY_FILES += \
    device/jm/cuttlefish/jm-os-release.txt:$(TARGET_COPY_OUT_PRODUCT)/etc/jm-os-release.txt
