#!/usr/bin/env python3
"""Local dev server that mimics GitHub Pages' 404.html fallback behavior.

Plain `python3 -m http.server` does NOT serve a custom 404 page, so refreshing
on a path like /engineering always 404s locally even though it works on GitHub
Pages. Use this instead when testing routing/refresh behavior:

    python3 dev-server.py [port] [directory]

Defaults to port 8000, current directory.
"""
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code == 404:
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open(os.path.join(self.directory, '404.html'), 'rb') as f:
                self.wfile.write(f.read())
            return
        return super().send_error(code, message, explain)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    directory = sys.argv[2] if len(sys.argv) > 2 else '.'
    os.chdir(directory)
    server = http.server.HTTPServer(('', port), Handler)
    print(f'Serving {directory} on http://localhost:{port} (with 404.html fallback like GitHub Pages)')
    server.serve_forever()
