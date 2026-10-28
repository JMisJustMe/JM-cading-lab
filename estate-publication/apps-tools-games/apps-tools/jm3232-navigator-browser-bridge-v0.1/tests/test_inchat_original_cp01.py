"""Static, adversarial CP01 checks, runnable before source archive reconstruction."""
import ast
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
SERVER = (BASE / "server.py").read_text(encoding="utf-8")
UI = (BASE / "public/jm3232-airborne-original-cp01.html").read_text(encoding="utf-8")
CANONICAL = "https://jmisjustme-estate.pages.dev/navigator/"
URI = "ui://jm3232-navigator/airborne-original-cp01.html"
PROTECTED_TOOLS = (
    '"search"', '"fetch"', '"navigator_open_stringdoor"', '"navigator_resolve_rootword"',
    '"navigator_return_lineage"', '"navigator_create_stringmark"', '"navigator_register_body"',
    '"navigator_create_stringreceipt"', '"navigator_export_savepack"', '"navigator_bridge_status"'
)


class FrameParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.frames = []
        self.scripts = 0
    def handle_starttag(self, tag, attrs):
        if tag == "iframe":
            self.frames.append(dict(attrs))
        elif tag == "script":
            self.scripts += 1


class CP01Contract(unittest.TestCase):
    def test_python_syntax(self):
        ast.parse(SERVER, filename="server.py")

    def test_old_tools_retained(self):
        for tool in PROTECTED_TOOLS:
            self.assertIn('"name": ' + tool, SERVER, tool)
        self.assertIn('WIDGET_URI', SERVER)
        self.assertIn('navigator-stringdoor-v0.1.html', SERVER)

    def test_render_tool_is_additive_read_only(self):
        self.assertEqual(SERVER.count('"name": "navigator_render_original_browser"'), 1)
        self.assertIn('"readOnlyHint": True, "destructiveHint": False', SERVER)
        self.assertIn('"host_frame_contact": "OPEN_UNVERIFIED"', SERVER)
        self.assertIn('"external_internet_handoff": "STILL_OPEN"', SERVER)

    def test_resource_list_and_read(self):
        self.assertIn('resources.append({', SERVER)
        self.assertIn('if uri == BROWSER_URI:', SERVER)
        self.assertIn('"openai/ui": {"availableDisplayModes": ["inline", "fullscreen"]}', SERVER)
        self.assertGreaterEqual(SERVER.count(URI), 1)

    def test_constrained_origin(self):
        self.assertIn('"frameDomains": ["https://jmisjustme-estate.pages.dev"]', SERVER)
        self.assertNotIn('"frameDomains": ["*"]', SERVER)
        self.assertIn('BROWSER_CANONICAL = "' + CANONICAL + '"', SERVER)

    def test_authentic_embedded_url_only(self):
        parser = FrameParser()
        parser.feed(UI)
        self.assertEqual(len(parser.frames), 1)
        frame = parser.frames[0]
        self.assertEqual(frame["src"], CANONICAL)
        self.assertEqual(frame["referrerpolicy"], "strict-origin-when-cross-origin")
        self.assertIn("allow-scripts", frame["sandbox"])
        self.assertNotIn("allow-top-navigation", frame["sandbox"])

    def test_no_unsupported_success_claim(self):
        self.assertIn("not yet proved", UI.lower()) if "not yet proved" in UI.lower() else self.assertIn("still require host inspection", UI)
        self.assertIn("not a reconstructed imitation", UI)
        self.assertNotIn("fully embedded and proven", UI.lower())

    def test_original_file_exists(self):
        self.assertTrue((BASE / "public/navigator-stringdoor-v0.1.html").exists() or 'navigator-stringdoor-v0.1.html' in SERVER)

    def test_unchanged_static_source_signatures(self):
        self.assertIn('async def invoke_tool(name: str, args: dict[str, Any])', SERVER)
        self.assertIn('@app.post("/mcp")', SERVER)
        self.assertIn('origin_permitted(request)', SERVER)
        self.assertIn('def allowed_origins()', SERVER)


if __name__ == "__main__":
    unittest.main()
