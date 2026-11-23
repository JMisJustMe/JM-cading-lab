"""Independent JM MCP WORKSHOP v0.1 HTTP/stdio entrypoint.

Build Mesh is an optional separate donor, never imported or modified here.
"""
from runtime import serve
import workshop

if __name__=='__main__':
    serve('JM MCP WORKSHOP', workshop.VERSION, workshop.list_tools(), workshop.HANDLERS,
          workshop.resources(), workshop.read_resource)
