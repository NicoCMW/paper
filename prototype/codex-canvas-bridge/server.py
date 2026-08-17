#!/usr/bin/env python3
"""Throwaway local MCP bridge for the Canvas/Codex integration prototype."""

from __future__ import annotations

import base64
import copy
import json
import mimetypes
import os
import re
import shutil
import sys
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
ASSETS_DIR = ROOT / "assets"
INDEX_FILE = ROOT / "index.html"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def image_dimensions(data: bytes) -> Tuple[int, int]:
    """Read common image dimensions without adding a dependency to the prototype."""
    if data.startswith(b"\x89PNG") and len(data) >= 24:
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    if data.startswith(b"GIF") and len(data) >= 10:
        return int.from_bytes(data[6:8], "little"), int.from_bytes(data[8:10], "little")
    if data.startswith(b"\xff\xd8"):
        index = 2
        while index + 9 < len(data):
            if data[index] != 0xFF:
                index += 1
                continue
            marker = data[index + 1]
            index += 2
            if marker in (0xD8, 0xD9):
                continue
            if index + 2 > len(data):
                break
            length = int.from_bytes(data[index:index + 2], "big")
            if marker in range(0xC0, 0xC4) and index + 7 <= len(data):
                return int.from_bytes(data[index + 5:index + 7], "big"), int.from_bytes(data[index + 3:index + 5], "big")
            index += max(length, 2)
    return 320, 180


def decode_data_url(value: str) -> Tuple[str, bytes]:
    match = re.match(r"^data:([^;,]+);base64,(.*)$", value, re.DOTALL)
    if not match:
        raise ValueError("Expected a base64 data URL")
    return match.group(1), base64.b64decode(match.group(2))


def snapshot() -> Dict[str, Any]:
    return {
        "canvas": copy.deepcopy(STATE["canvas"]),
        "assets": copy.deepcopy(STATE["assets"]),
        "selection": copy.deepcopy(STATE["selection"]),
        "groups": copy.deepcopy(STATE["groups"]),
    }


def restore(value: Dict[str, Any]) -> None:
    STATE["canvas"] = value["canvas"]
    STATE["assets"] = value["assets"]
    STATE["selection"] = value["selection"]
    STATE["groups"] = value["groups"]


STATE: Dict[str, Any] = {
    "canvas": {"id": "canvas-prototype", "name": "Codex Canvas Prototype"},
    "assets": {},
    "selection": [],
    "groups": {},
    "history": [],
    "redo": [],
}


def mutate() -> None:
    STATE["history"].append(snapshot())
    STATE["redo"].clear()


def public_asset(asset: Dict[str, Any]) -> Dict[str, Any]:
    result = copy.deepcopy(asset)
    result["selected"] = asset["id"] in STATE["selection"]
    return result


def public_state() -> Dict[str, Any]:
    return {
        "canvas": copy.deepcopy(STATE["canvas"]),
        "assets": [public_asset(asset) for asset in STATE["assets"].values()],
        "selection": list(STATE["selection"]),
        "groups": copy.deepcopy(STATE["groups"]),
        "historyDepth": len(STATE["history"]),
        "redoDepth": len(STATE["redo"]),
    }


def file_payload(path: Path) -> Tuple[str, bytes]:
    data = path.read_bytes()
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return mime, data


def save_asset(data: bytes, filename: str, mime: str, source: str, provenance: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    asset_id = new_id("asset")
    suffix = Path(filename).suffix.lower() or ".bin"
    destination = ASSETS_DIR / f"{asset_id}{suffix}"
    destination.write_bytes(data)
    width, height = image_dimensions(data)
    asset = {
        "id": asset_id,
        "name": filename or asset_id,
        "mime": mime,
        "path": str(destination.relative_to(ROOT)),
        "x": 80,
        "y": 80,
        "width": width,
        "height": height,
        "source": source,
        "createdAt": now(),
    }
    if provenance:
        asset["provenance"] = provenance
    STATE["assets"][asset_id] = asset
    return asset


def rect(asset: Dict[str, Any]) -> Tuple[float, float, float, float]:
    return asset["x"], asset["y"], asset["width"], asset["height"]


def overlaps(candidate: Tuple[float, float, float, float], other: Dict[str, Any], gap: int = 24) -> bool:
    ax, ay, aw, ah = candidate
    bx, by, bw, bh = rect(other)
    return not (
        ax + aw + gap <= bx
        or bx + bw + gap <= ax
        or ay + ah + gap <= by
        or by + bh + gap <= ay
    )


def free(candidate: Tuple[float, float, float, float]) -> bool:
    return all(not overlaps(candidate, asset) for asset in STATE["assets"].values())


def placement_for(width: int, height: int) -> Tuple[float, float, str]:
    selected = [STATE["assets"][asset_id] for asset_id in STATE["selection"] if asset_id in STATE["assets"]]
    anchor = selected[1] if len(selected) >= 2 else (selected[0] if selected else None)
    gap = 24
    if anchor:
        ax, ay, aw, ah = rect(anchor)
        candidates = [
            (ax + aw + gap, ay, "right"),
            (ax, ay + ah + gap, "below"),
            (ax, max(24, ay - height - gap), "above"),
            (max(24, ax - width - gap), ay, "left"),
        ]
        for x, y, direction in candidates:
            if free((x, y, width, height)):
                return x, y, direction
        for radius in range(1, 20):
            step = max(width, height) + gap
            candidates = []
            for dx, dy in ((radius, 0), (0, radius), (0, -radius), (-radius, 0), (radius, radius), (-radius, radius), (radius, -radius), (-radius, -radius)):
                candidates.append((max(24, ax + dx * step), max(24, ay + dy * step), "nearest"))
            for x, y, direction in candidates:
                if free((x, y, width, height)):
                    return x, y, direction
    x, y = 80, 80
    while not free((x, y, width, height)):
        x += width + gap
    return x, y, "canvas-start"


def tool_result(text: str, images: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    content: List[Dict[str, Any]] = [{"type": "text", "text": text}]
    if images:
        content.extend({"type": "image", "data": data, "mimeType": mime} for data, mime in images)
    return {"content": content, "structuredContent": public_state()}


def tool_definitions() -> List[Dict[str, Any]]:
    return [
        {
            "name": "canvas_create",
            "description": "Create and make active a new local Canvas.",
            "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]},
        },
        {
            "name": "canvas_get_state",
            "description": "Read the active Canvas, all Assets, Selection, groups, and local provenance.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "canvas_get_selection",
            "description": "Read the currently selected Assets as Codex context, including image content when available.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "canvas_select_assets",
            "description": "Set the active Selection by Asset id in click order. The second id is the placement anchor.",
            "inputSchema": {"type": "object", "properties": {"asset_ids": {"type": "array", "items": {"type": "string"}}}, "required": ["asset_ids"]},
        },
        {
            "name": "canvas_import_asset",
            "description": "Add a local image as an Asset. Use a local path or a base64 data URL.",
            "inputSchema": {"type": "object", "properties": {"path": {"type": "string"}, "data_url": {"type": "string"}, "filename": {"type": "string"}}, "anyOf": [{"required": ["path"]}, {"required": ["data_url", "filename"]}]},
        },
        {
            "name": "canvas_group_selection",
            "description": "Group the currently selected Assets as one local group.",
            "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}}, "required": []},
        },
        {
            "name": "canvas_receive_generated_asset",
            "description": "Receive an image generated by Codex, save it locally as a new Asset, record provenance, and place it near the selected references.",
            "inputSchema": {"type": "object", "properties": {"path": {"type": "string"}, "data_url": {"type": "string"}, "filename": {"type": "string"}, "instruction": {"type": "string"}, "reference_ids": {"type": "array", "items": {"type": "string"}}}, "required": ["filename", "instruction"]},
        },
        {
            "name": "canvas_undo",
            "description": "Undo the last Canvas mutation.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "canvas_redo",
            "description": "Redo the last undone Canvas mutation.",
            "inputSchema": {"type": "object", "properties": {}},
        },
    ]


def require_asset(asset_id: str) -> Dict[str, Any]:
    if asset_id not in STATE["assets"]:
        raise ValueError(f"Unknown Asset: {asset_id}")
    return STATE["assets"][asset_id]


def call_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    if name == "canvas_create":
        mutate()
        STATE["canvas"] = {"id": new_id("canvas"), "name": args.get("name") or "Untitled Canvas"}
        STATE["assets"].clear()
        STATE["selection"] = []
        STATE["groups"].clear()
        return tool_result(f"Created Canvas '{STATE['canvas']['name']}'.")

    if name == "canvas_get_state":
        return tool_result(json.dumps(public_state(), indent=2, ensure_ascii=False))

    if name == "canvas_get_selection":
        selected = [STATE["assets"][asset_id] for asset_id in STATE["selection"] if asset_id in STATE["assets"]]
        images = []
        for asset in selected:
            data = (ROOT / asset["path"]).read_bytes()
            images.append((base64.b64encode(data).decode("ascii"), asset["mime"]))
        return tool_result(json.dumps({"selection": [public_asset(asset) for asset in selected]}, indent=2, ensure_ascii=False), images)

    if name == "canvas_select_assets":
        ids = list(dict.fromkeys(args.get("asset_ids", [])))
        for asset_id in ids:
            require_asset(asset_id)
        mutate()
        STATE["selection"] = ids
        return tool_result(f"Selected {len(ids)} Asset(s) in click order: {', '.join(ids) or 'none'}.")

    if name == "canvas_import_asset":
        if args.get("path"):
            source_path = Path(args["path"]).expanduser().resolve()
            if not source_path.is_file():
                raise ValueError(f"Local file does not exist: {source_path}")
            mime, data = file_payload(source_path)
            filename = args.get("filename") or source_path.name
            source = str(source_path)
        elif args.get("data_url"):
            mime, data = decode_data_url(args["data_url"])
            filename = args.get("filename") or "imported-image"
            source = "clipboard-or-upload"
        else:
            raise ValueError("Provide path or data_url")
        mutate()
        asset = save_asset(data, filename, mime, source)
        return tool_result(f"Imported Asset {asset['id']} ({asset['name']}).")

    if name == "canvas_group_selection":
        if len(STATE["selection"]) < 2:
            raise ValueError("Select at least two Assets before grouping")
        mutate()
        group_id = new_id("group")
        group = {"id": group_id, "name": args.get("name") or "Untitled group", "assetIds": list(STATE["selection"]), "createdAt": now()}
        STATE["groups"][group_id] = group
        for asset_id in STATE["selection"]:
            STATE["assets"][asset_id]["groupId"] = group_id
        return tool_result(f"Grouped {len(STATE['selection'])} Assets as {group_id}.")

    if name == "canvas_receive_generated_asset":
        if args.get("path"):
            source_path = Path(args["path"]).expanduser().resolve()
            if not source_path.is_file():
                raise ValueError(f"Generated image does not exist: {source_path}")
            mime, data = file_payload(source_path)
            filename = args.get("filename") or source_path.name
        elif args.get("data_url"):
            mime, data = decode_data_url(args["data_url"])
            filename = args.get("filename") or "generated-image.png"
        else:
            raise ValueError("Provide path or data_url for the generated image")
        references = args.get("reference_ids") or list(STATE["selection"])
        for asset_id in references:
            require_asset(asset_id)
        mutate()
        asset = save_asset(data, filename, mime, "codex", {"references": references, "instruction": args["instruction"], "createdAt": now(), "canvasId": STATE["canvas"]["id"]})
        width, height = asset["width"], asset["height"]
        x, y, direction = placement_for(width, height)
        asset["x"], asset["y"] = x, y
        asset["placement"] = {"anchorId": references[1] if len(references) >= 2 else (references[0] if references else None), "direction": direction}
        STATE["selection"] = [asset["id"]]
        return tool_result(f"Received Generated Asset {asset['id']} and placed it {direction} of the selected references.")

    if name == "canvas_undo":
        if not STATE["history"]:
            return tool_result("Nothing to undo.")
        STATE["redo"].append(snapshot())
        restore(STATE["history"].pop())
        return tool_result("Undid the last Canvas mutation.")

    if name == "canvas_redo":
        if not STATE["redo"]:
            return tool_result("Nothing to redo.")
        STATE["history"].append(snapshot())
        restore(STATE["redo"].pop())
        return tool_result("Redid the last Canvas mutation.")

    raise ValueError(f"Unknown MCP tool: {name}")


class Handler(BaseHTTPRequestHandler):
    server_version = "CodexCanvasPrototype/0.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[prototype] " + (fmt % args) + "\n")

    def send_bytes(self, status: int, data: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, status: int, payload: Dict[str, Any], mcp: bool = False) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if mcp:
            self.send_header("MCP-Protocol-Version", "2025-11-25")
        self.end_headers()
        self.wfile.write(data)

    def valid_origin(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or origin.startswith("http://127.0.0.1") or origin.startswith("http://localhost")

    def body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length).decode("utf-8")) if length else {}

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_json(200, {"ok": True, "mcp": "/mcp", "canvas": STATE["canvas"]})
            return
        if parsed.path == "/ui/state":
            self.send_json(200, public_state())
            return
        if parsed.path == "/":
            self.send_bytes(200, INDEX_FILE.read_bytes(), "text/html; charset=utf-8")
            return
        if parsed.path.startswith("/assets/"):
            asset_id = unquote(parsed.path.removeprefix("/assets/")).split(".")[0]
            asset = STATE["assets"].get(asset_id)
            if not asset:
                self.send_json(404, {"error": "Unknown Asset"})
                return
            path = ROOT / asset["path"]
            if not path.is_file():
                self.send_json(404, {"error": "Asset file is missing"})
                return
            self.send_bytes(200, path.read_bytes(), asset["mime"])
            return
        self.send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if not self.valid_origin():
            self.send_json(403, {"error": "Invalid Origin"})
            return
        parsed = urlparse(self.path)
        try:
            payload = self.body()
            if parsed.path == "/mcp":
                self.handle_mcp(payload)
                return
            if parsed.path == "/ui/import":
                result = call_tool("canvas_import_asset", payload)
                self.send_json(200, {"ok": True, "state": public_state(), "result": result})
                return
            if parsed.path == "/ui/select":
                result = call_tool("canvas_select_assets", payload)
                self.send_json(200, {"ok": True, "state": public_state(), "result": result})
                return
            if parsed.path == "/ui/action":
                result = call_tool(payload["name"], payload.get("arguments", {}))
                self.send_json(200, {"ok": True, "state": public_state(), "result": result})
                return
            self.send_json(404, {"error": "Not found"})
        except Exception as exc:  # Prototype: return the error visibly to the caller.
            self.send_json(400, {"ok": False, "error": str(exc)})

    def handle_mcp(self, payload: Dict[str, Any]) -> None:
        request_id = payload.get("id")
        method = payload.get("method")
        if request_id is None and method.startswith("notifications/"):
            self.send_response(202)
            self.end_headers()
            return
        if method == "initialize":
            result = {"protocolVersion": "2025-11-25", "capabilities": {"tools": {}}, "serverInfo": {"name": "codex-canvas-prototype", "version": "0.1.0"}}
            self.send_json(200, {"jsonrpc": "2.0", "id": request_id, "result": result}, mcp=True)
            return
        if method == "ping":
            self.send_json(200, {"jsonrpc": "2.0", "id": request_id, "result": {}}, mcp=True)
            return
        if method == "tools/list":
            self.send_json(200, {"jsonrpc": "2.0", "id": request_id, "result": {"tools": tool_definitions()}}, mcp=True)
            return
        if method == "tools/call":
            params = payload.get("params", {})
            try:
                result = call_tool(params["name"], params.get("arguments", {}))
                self.send_json(200, {"jsonrpc": "2.0", "id": request_id, "result": result}, mcp=True)
            except Exception as exc:
                error = {"code": -32000, "message": str(exc)}
                self.send_json(200, {"jsonrpc": "2.0", "id": request_id, "error": error}, mcp=True)
            return
        self.send_json(200, {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32601, "message": f"Unsupported method: {method}"}}, mcp=True)


def main() -> None:
    port = int(os.environ.get("CODEX_CANVAS_PORT", "29980"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Codex Canvas prototype: http://127.0.0.1:{port}/", flush=True)
    print(f"MCP endpoint: http://127.0.0.1:{port}/mcp", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
