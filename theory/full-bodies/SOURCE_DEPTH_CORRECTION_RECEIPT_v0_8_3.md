# JM THEORY MULTIHUB — SOURCE-DEPTH CORRECTION RECEIPT v0.8.3

**Date:** 20 July 2026  
**Public body library:** `theory/full-bodies/all-37.html`  
**Vault:** `theory/full-bodies/`

## User contact that triggered correction

Android device contact showed two different source depths under the same **FULL BODY** badge:

- **Theory of Mind** opened a shaped collection route whose own text states that the full source remains preserved in the Estate.
- **When Stone and Scroll Speak** opened a genuinely long Professional Consolidated Edition manuscript.

The public reader was therefore mixing shaped standalones and full/canonical manuscripts under one false depth label.

## Root cause

The public all-37 reader loaded the compact v0.4 seven-part payload:

- payload parts: **7**
- concatenated base64 length: **50,428**
- decoded mixed routes: **297**

The actual Estate Full-Body First v0.5 OneBody carries a separate larger payload:

- payload parts declared by the Estate reader: **8**
- embedded base64 length: **302,340**
- established body population: **37**

The public build was therefore reading the smaller census/compact rail, not the larger v0.5 body rail.

## Collection source architecture

The collection preserves separate layers:

- `BODY_STANDALONES/` — shaped independently readable preservation/manuscript bodies;
- `EXTRACTED_SOURCE_TEXT/` — the fuller recovered source-text layer;
- `GUIDES/PUBLICATION_DRAFTS_*` — public-paper drafts.

A shaped standalone is not automatically the raw/full source. The body's own boundary governs its badge.

## Public correction applied

The public Theory Wing now states:

- **13 verified full/canonical bodies**;
- **24 shaped collection standalones**;
- **37 established body routes**;
- **260 census cards excluded**;
- **297 census routes preserved separately**.

The 37-body library now badges collection records as **SHAPED STANDALONE** and recent/canonical records as **FULL / CANONICAL BODY**.

The main Theory Wing, Full-Body Vault, source-recovery ledger and registry have all been corrected to remove the false `37 public full bodies` crown.

## Authority preserved

The actual Estate source authorities remain:

- `JM_THEORY_MULTIHUB_CURRENT(3).html` — v0.5 Full-Body First OneBody;
- `JM_THEORY_MULTIHUB_v0_5_READABLE_SOURCE_ZIONFOLDER.zip` — readable-source package;
- the older collection architecture containing both `BODY_STANDALONES` and `EXTRACTED_SOURCE_TEXT` layers.

## Open task

Migrate the real v0.5 eight-part payload or the `EXTRACTED_SOURCE_TEXT` files to the public repository. Promote a collection body to full-source status only after that deeper source is publicly mounted and device-contact tested.

## Locks

> The body’s own boundary outranks the package label.

> A shaped standalone is not automatically the raw source.

> Full bodies first. Census cards second.
