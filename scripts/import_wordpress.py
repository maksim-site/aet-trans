#!/usr/bin/env python3
"""Normalize public WordPress posts into static-site content data."""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


BLOCK_TAGS = {"p", "h2", "h3", "h4", "li", "blockquote"}
SKIP_TAGS = {"script", "style", "noscript"}
SHORTCODE_RE = re.compile(r"\[/?[a-zA-Z_][^\]]*\]")
SPACE_RE = re.compile(r"\s+")


def clean_text(value: str) -> str:
    value = html.unescape(value)
    value = SHORTCODE_RE.sub(" ", value)
    value = value.replace("\u2014", "-").replace("\u2013", "-").replace("\u2212", "-")
    return SPACE_RE.sub(" ", value).strip()


def clean_image_url(value: str) -> str:
    value = html.unescape(value).strip()
    if not value.startswith(("https://", "http://")):
        return ""

    parts = urlsplit(value)
    return urlunsplit(("https", parts.netloc, parts.path, parts.query, ""))


class ArticleParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocks: list[dict[str, str]] = []
        self.images: list[str] = []
        self._active_tag: str | None = None
        self._active_text: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {key: value or "" for key, value in attrs}

        if tag in SKIP_TAGS:
            self._skip_depth += 1
            return

        if self._skip_depth:
            return

        if tag == "img":
            image_url = ""
            for key in ("data-large-file", "data-orig-file", "data-url", "src"):
                image_url = clean_image_url(attrs_map.get(key, ""))
                if image_url:
                    break
            if image_url and image_url not in self.images:
                self.images.append(image_url)
            return

        if tag in BLOCK_TAGS and self._active_tag is None:
            self._active_tag = tag
            self._active_text = []

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1
            return

        if self._skip_depth:
            return

        if tag == self._active_tag:
            value = clean_text(" ".join(self._active_text))
            if value:
                block_type = {
                    "li": "list-item",
                    "blockquote": "quote",
                    "h2": "heading",
                    "h3": "heading",
                    "h4": "heading",
                }.get(tag, "paragraph")
                self.blocks.append({"type": block_type, "text": value})
            self._active_tag = None
            self._active_text = []

    def handle_data(self, data: str) -> None:
        if self._skip_depth or self._active_tag is None:
            return
        self._active_text.append(data)


def normalize_post(post: dict) -> dict:
    parser = ArticleParser()
    parser.feed(post.get("content", {}).get("rendered", ""))

    excerpt_parser = ArticleParser()
    excerpt_parser.feed(post.get("excerpt", {}).get("rendered", ""))

    title = clean_text(post.get("title", {}).get("rendered", "Без названия"))
    excerpt = " ".join(block["text"] for block in excerpt_parser.blocks)
    paragraph_text = " ".join(
        block["text"] for block in parser.blocks if block["type"] in {"paragraph", "list-item"}
    )
    summary_source = excerpt or paragraph_text
    summary = summary_source[:237].rstrip()
    if len(summary_source) > 237:
        summary += "..."

    return {
        "id": post.get("id"),
        "date": post.get("date", "")[:10],
        "year": post.get("date", "")[:4],
        "slug": post.get("slug", ""),
        "title": title,
        "summary": summary,
        "blocks": parser.blocks,
        "images": parser.images[:8],
        "legacyUrl": post.get("link", ""),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    posts: list[dict] = []
    for path in args.inputs:
        posts.extend(json.loads(path.read_text(encoding="utf-8")))

    normalized = [normalize_post(post) for post in posts]
    normalized.sort(key=lambda post: (post["date"], post["id"] or 0), reverse=True)

    payload = {
        "meta": {
            "source": "https://aet-trans.ru/",
            "importedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "count": len(normalized),
        },
        "posts": normalized,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
