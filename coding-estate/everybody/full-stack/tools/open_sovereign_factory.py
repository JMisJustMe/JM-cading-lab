#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

HERE = Path(__file__).resolve().parent
REPO_DEFAULT = HERE.parents[3]
FACTORY_PATH = HERE / "full_stack_factory.py"
CENSUS_PATH = REPO_DEFAULT / "coding-estate/everybody/sovereign-census/sovereign_census.py"
POST_REGISTRY = "coding-estate/everybody/sovereign-census/body-registry-post-100.json"


def import_file(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise SystemExit(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def repo_from_argv(argv: list[str]) -> Path:
    for index, value in enumerate(argv):
        if value == "--repo" and index + 1 < len(argv):
            return Path(argv[index + 1]).resolve()
        if value.startswith("--repo="):
            return Path(value.split("=", 1)[1]).resolve()
    return Path.cwd().resolve()


def configure(repo: Path) -> tuple[ModuleType, dict]:
    census_module = import_file("jm_sovereign_census", CENSUS_PATH)
    census = census_module.load_census(repo)
    factory = import_file("jm_full_stack_factory", FACTORY_PATH)
    registries = list(factory.REGISTRIES)
    if POST_REGISTRY not in registries:
        registries.append(POST_REGISTRY)
    factory.REGISTRIES = tuple(registries)
    factory.EXPECTED_BODY_COUNT = census["current_total"]
    return factory, census


def main() -> int:
    repo = repo_from_argv(sys.argv[1:])
    factory, census = configure(repo)
    print(
        f"OPEN_SOVEREIGN_FACTORY count={census['current_total']} "
        f"post100={census['post_100_confirmed_count']} "
        f"digest={census['identity_digest_sha256']}"
    )
    return int(factory.main())


if __name__ == "__main__":
    raise SystemExit(main())
