
import ipaddress
import socket
import time

from collections import deque
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup


USER_AGENT = "KnowHubBot/1.0"
REQUEST_TIMEOUT = 15
MAX_PAGE_SIZE = 2 * 1024 * 1024  # 2 MB per page
MAX_REDIRECTS = 5


class CrawlerError(Exception):
    """Raised when a URL cannot safely be crawled."""


def validate_public_url(url):
    """
    Validate a URL and reject private, local, or non-HTTP destinations.
    """

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise CrawlerError("Only HTTP and HTTPS URLs are supported.")

    if not parsed.hostname:
        raise CrawlerError("Invalid URL.")

    if parsed.username or parsed.password:
        raise CrawlerError("URLs containing credentials are not allowed.")

    if parsed.port and parsed.port not in (80, 443):
        raise CrawlerError("Only ports 80 and 443 are allowed.")

    hostname = parsed.hostname.lower()

    if hostname in ("localhost", "localhost.localdomain"):
        raise CrawlerError("Localhost URLs are not allowed.")

    try:
        addresses = socket.getaddrinfo(
            hostname,
            parsed.port or (443 if parsed.scheme == "https" else 80),
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror:
        raise CrawlerError("Unable to resolve website hostname.")

    if not addresses:
        raise CrawlerError("Website hostname could not be resolved.")

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])

        if not ip.is_global:
            raise CrawlerError(
                "Private or non-public network destinations are not allowed."
            )

    return parsed


def safe_fetch(url):
    """
    Fetch a URL while validating every redirect destination.
    Limits the response size and rejects oversized responses.
    """

    current_url = url

    for _ in range(MAX_REDIRECTS + 1):
        validate_public_url(current_url)

        try:
            with requests.get(
                current_url,
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
                stream=True,
                allow_redirects=False,
            ) as response:

                if response.is_redirect or response.is_permanent_redirect:
                    location = response.headers.get("Location")

                    if not location:
                        raise CrawlerError("Redirect has no destination.")

                    current_url = urljoin(current_url, location)
                    continue

                if response.status_code >= 400:
                    raise CrawlerError(
                        f"Website returned HTTP {response.status_code}."
                    )

                content_length = response.headers.get("Content-Length")

                if content_length:
                    try:
                        if int(content_length) > MAX_PAGE_SIZE:
                            raise CrawlerError("Page exceeds the 2 MB limit.")
                    except ValueError:
                        raise CrawlerError("Invalid Content-Length header.")

                chunks = []
                total_size = 0

                for chunk in response.iter_content(chunk_size=8192):
                    if not chunk:
                        continue

                    total_size += len(chunk)

                    if total_size > MAX_PAGE_SIZE:
                        raise CrawlerError("Page exceeds the 2 MB limit.")

                    chunks.append(chunk)

                return {
                    "url": response.url,
                    "status_code": response.status_code,
                    "content_type": response.headers.get(
                        "Content-Type", ""
                    ),
                    "content": b"".join(chunks),
                }

        except requests.RequestException as exc:
            raise CrawlerError(f"Unable to fetch webpage: {exc}")

    raise CrawlerError("Too many redirects.")


def get_robots_parser(base_url):
    """
    Fetch and parse robots.txt for the target website.
    """

    parsed = urlparse(base_url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

    parser = RobotFileParser()
    parser.set_url(robots_url)

    try:
        response = safe_fetch(robots_url)

        if response["status_code"] == 200:
            lines = response["content"].decode(
                "utf-8", errors="replace"
            ).splitlines()
            parser.parse(lines)
        else:
            parser.parse(["User-agent: *", "Disallow:"])

    except CrawlerError:
        # Fail closed if robots.txt cannot be safely checked.
        raise CrawlerError(
            "Unable to verify robots.txt. Crawling has been stopped."
        )

    return parser


def extract_page_content(html):
    """
    Extract readable text and links from HTML.
    """

    soup = BeautifulSoup(html, "html.parser")

    for element in soup([
        "script",
        "style",
        "noscript",
        "header",
        "footer",
        "nav",
        "svg",
        "iframe",
    ]):
        element.decompose()

    title = ""

    if soup.title:
        title = soup.title.get_text(" ", strip=True)

    main_content = soup.find("main") or soup.find("article") or soup.body

    if main_content:
        text = main_content.get_text(" ", strip=True)
    else:
        text = soup.get_text(" ", strip=True)

    # Normalize whitespace.
    text = " ".join(text.split())

    links = []

    for anchor in soup.find_all("a", href=True):
        links.append(anchor["href"])

    return {
        "title": title,
        "content": text,
        "links": links,
    }


def crawl_website(start_url, max_pages=5, max_depth=2):
    """
    Crawl public pages within the same website.

    Returns extracted webpage information and crawl errors.
    """

    if not 1 <= max_pages <= 20:
        raise CrawlerError("max_pages must be between 1 and 20.")

    if not 0 <= max_depth <= 3:
        raise CrawlerError("max_depth must be between 0 and 3.")

    parsed_start = validate_public_url(start_url)

    start_url = urldefrag(start_url)[0]

    base_host = parsed_start.hostname.lower()

    robots = get_robots_parser(start_url)

    queue = deque([(start_url, 0)])
    visited = set()

    pages = []
    errors = []

    while queue and len(pages) < max_pages:

        current_url, depth = queue.popleft()

        current_url = urldefrag(current_url)[0]

        if current_url in visited:
            continue

        visited.add(current_url)

        parsed = validate_public_url(current_url)

        if parsed.hostname.lower() != base_host:
            continue

        if not robots.can_fetch(USER_AGENT, current_url):
            continue

        try:
            response = safe_fetch(current_url)

            content_type = response["content_type"].lower()

            if "text/html" not in content_type:
                continue

            html = response["content"].decode(
                "utf-8", errors="replace"
            )

            extracted = extract_page_content(html)

            if not extracted["content"]:
                continue

            pages.append({
                "url": response["url"],
                "title": extracted["title"],
                "content": extracted["content"],
            })

            # Discover more pages only within the configured depth.
            if depth < max_depth:

                for link in extracted["links"]:

                    next_url = urljoin(response["url"], link)
                    next_url = urldefrag(next_url)[0]

                    next_parsed = urlparse(next_url)

                    if next_parsed.hostname:
                        if next_parsed.hostname.lower() == base_host:
                            if next_url not in visited:
                                queue.append((next_url, depth + 1))

            # Be polite to the website.
            time.sleep(0.5)

        except CrawlerError as exc:
            errors.append({
                "url": current_url,
                "error": str(exc),
            })

        except Exception as exc:
            errors.append({
                "url": current_url,
                "error": str(exc),
            })

    return {
        "start_url": start_url,
        "total_pages": len(pages),
        "pages": pages,
        "errors": errors,
    }