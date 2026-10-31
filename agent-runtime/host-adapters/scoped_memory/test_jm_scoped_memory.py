#!/usr/bin/env python3
"""Executable contact and recovery tests for optional JM scoped memory."""
import asyncio
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jm_scoped_memory import HostScope, ScopedMemory, ScopeChanged, MemoryConflict, MemoryIntegrity

# In JM repo the test uses EXACT preexisting sovereign-core runtime; never a mock.
ROOT = Path(__file__).resolve().parents[3] if Path(__file__).resolve().parents[3].joinpath('agent-runtime/jm_agent_runtime.py').exists() else None


def get_core():
    if ROOT is None:
        raise unittest.SkipTest('JM sovereign-core repository not mounted; original-core execution HOLD')
    output = subprocess.check_output([sys.executable, 'agent-runtime/jm_agent_runtime.py', '--core-only', '--query', 'coding runtime'], cwd=ROOT, text=True)
    return json.loads(output)


class ScopedMemoryContact(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.core = get_core()

    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'store'
        self.host = HostScope('owner-a', str(Path(self.temp.name) / 'repo-a'))
        self.codex = ScopedMemory(self.root, self.host, self.core, 'codex')

    async def test_cross_harness_write_read_and_reentry(self):
        first = await self.codex.write('project_route', 'Use JM native core; preserve identities')
        claude = ScopedMemory(self.root, HostScope('owner-a', str(Path(self.temp.name) / 'repo-a')), self.core, 'claude-code')
        other = await claude.read('project_route')
        self.assertEqual(other['body'], 'Use JM native core; preserve identities')
        self.assertEqual(other['digest'], first['digest'])
        self.assertEqual(first['status'], 'COMMITTED')
        self.assertEqual(await claude.list_keys(), ['project_route'])

    async def test_update_chain_and_conflict(self):
        a = await self.codex.write('note', 'first')
        with self.assertRaises(MemoryConflict):
            await self.codex.write('note', 'duplicate')
        b = await self.codex.write('note', 'second', mode='update')
        self.assertEqual((await self.codex.read('note'))['previous'], a['digest'])
        self.assertEqual(b['revision'], 2)
        with self.assertRaises(MemoryConflict):
            await self.codex.write('missing', 'absent', mode='update')

    async def test_correction_requires_current_evidence_and_reuses_new_state(self):
        first = await self.codex.write("observed", "Initial reading: NOTION_NOT_CONNECTED")
        reader = ScopedMemory(self.root, HostScope("owner-a", str(Path(self.temp.name) / "repo-a")),
                              self.core, "second-host")
        observed = await reader.read("observed")
        self.assertEqual(observed["digest"], first["digest"])
        corrected = await reader.write("observed", "Corrected: NOTION_CONNECTED_SOURCE_READ",
                                       mode="correct", expected_digest=observed["digest"])
        final = await self.codex.read("observed")
        self.assertEqual(final["body"], "Corrected: NOTION_CONNECTED_SOURCE_READ")
        self.assertEqual(final["previous"], first["digest"])
        self.assertEqual(final["revision"], 2)
        self.assertEqual(final["digest"], corrected["digest"])
        with self.assertRaises(MemoryConflict):
            await self.codex.write("observed", "Outdated correction must not replace evidence",
                                   mode="correct", expected_digest=first["digest"])
        self.assertEqual((await self.codex.read("observed"))["digest"], corrected["digest"])
        with self.assertRaises(ValueError):
            await self.codex.write("observed", "No anchor", mode="correct")

    async def test_cross_owner_and_workspace_isolation(self):
        await self.codex.write('note', 'owned')
        other_owner = ScopedMemory(self.root, HostScope('owner-b', str(Path(self.temp.name) / 'repo-a')), self.core, 'claude-code')
        other_workspace = ScopedMemory(self.root, HostScope('owner-a', str(Path(self.temp.name) / 'repo-b')), self.core, 'claude-code')
        for separate in (other_owner, other_workspace):
            self.assertEqual(await separate.list_keys(), [])
            with self.assertRaises(MemoryConflict):
                await separate.read('note')

    async def test_owner_switch_during_await_rejected_without_write(self):
        started = asyncio.Event()
        release = asyncio.Event()
        async def pause():
            started.set()
            await release.wait()
        task = asyncio.create_task(self.codex.write('stale', 'must not commit', before_commit=pause))
        await started.wait()
        self.host.switch('owner-b', str(Path(self.temp.name) / 'repo-a'))
        release.set()
        with self.assertRaises(ScopeChanged):
            await task
        self.host.switch('owner-a', str(Path(self.temp.name) / 'repo-a'))
        self.assertEqual(await self.codex.list_keys(), [])

    async def test_away_and_back_invalidates_old_lease(self):
        started, release = asyncio.Event(), asyncio.Event()
        async def pause():
            started.set()
            await release.wait()
        task = asyncio.create_task(self.codex.write('stale', 'no', before_commit=pause))
        await started.wait()
        self.host.switch('owner-b', str(Path(self.temp.name) / 'repo-a'))
        self.host.switch('owner-a', str(Path(self.temp.name) / 'repo-a'))
        release.set()
        with self.assertRaises(ScopeChanged):
            await task

    async def test_read_switch_during_await_rejected(self):
        await self.codex.write('note', 'safe')
        started, release = asyncio.Event(), asyncio.Event()
        async def pause():
            started.set()
            await release.wait()
        task = asyncio.create_task(self.codex.read('note', before_read=pause))
        await started.wait()
        self.host.switch('owner-b', str(Path(self.temp.name) / 'repo-a'))
        release.set()
        with self.assertRaises(ScopeChanged):
            await task

    async def test_corruption_detected_and_no_silent_repair(self):
        receipt = await self.codex.write('note', 'original')
        filename = self.root / (receipt['scope'] + '.json')
        broken = json.loads(filename.read_text())
        broken['notes']['note']['body'] = 'tampered'
        filename.write_text(json.dumps(broken))
        with self.assertRaises(MemoryIntegrity):
            await self.codex.read('note')
        with self.assertRaises(MemoryIntegrity):
            await self.codex.write('next', 'must not bypass corruption')

    async def test_core_drift_fails_closed(self):
        receipt = await self.codex.write('note', 'original')
        other_core = json.loads(json.dumps(self.core))
        other_core['source_digests']['new_source'] = {'path':'fake', 'sha256':'0'*64}
        changed = ScopedMemory(self.root, self.host, other_core, 'codex')
        with self.assertRaises(MemoryIntegrity):
            await changed.read('note')
        self.assertNotEqual(receipt['source_fingerprint'], changed.source_fingerprint)

    async def test_slug_size_and_invalid_core_rejected(self):
        for bad in ('../unsafe', 'UPPER', 'white space', '', 'a'*65):
            with self.assertRaises(ValueError):
                await self.codex.write(bad, 'x')
        with self.assertRaises(ValueError):
            await self.codex.write('size', 'x'*8193)
        with self.assertRaises(ValueError):
            ScopedMemory(self.root, self.host, {'schema':'not-JM'}, 'codex')

    async def test_no_cross_host_proof_transfer(self):
        receipt = await self.codex.write('note', 'independent')
        self.assertEqual(receipt['proof'], 'LOCAL_FILE_RETURN_NOT_DEVICE_OR_CLOUD')
        self.assertNotIn('OWNER_DEVICE', receipt['status'])


if __name__ == '__main__':
    unittest.main()