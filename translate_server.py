"""
LibreTranslate Local Server
===========================

Jalankan script ini di laptop/PC yang terkoneksi dengan jaringan yang sama dengan HP.

Usage:
    python translate_server.py

Server akan berjalan di: http://0.0.0.0:5000

Cara pakai dari HP:
1. Pastikan HP dan laptop satu jaringan WiFi
2. Cari IP laptop: ipconfig (Windows) atau ifconfig (Mac/Linux)
3. Buka app OpenToon → Settings
4. Masukkan IP: http://192.168.x.x:5000
5. Test Connection

API Endpoints:
- GET  /languages     - List available languages
- POST /translate     - Translate text
- GET  /health        - Health check
"""

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Try to import argos translate
try:
    import argostranslate.package
    import argostranslate.translate
    ARGOS_AVAILABLE = True
except ImportError:
    ARGOS_AVAILABLE = False
    print("WARNING: argostranslate not installed. Run: pip install argostranslate")

# Install required language packages on startup
def install_packages():
    """Install required language packages"""
    if not ARGOS_AVAILABLE:
        return

    print("Updating package index...")
    argostranslate.package.update_package_index()
    available = argostranslate.package.get_available_packages()

    # Get already installed
    installed = set()
    for pkg in argostranslate.package.get_installed_packages():
        installed.add((pkg.from_code, pkg.to_code))

    # Required language pairs
    needed = [
        ('en', 'id'), ('id', 'en'),
        ('en', 'ja'), ('ja', 'en'),
        ('en', 'ko'), ('ko', 'en'),
        ('en', 'zh'), ('zh', 'en'),
        ('en', 'ms'), ('ms', 'en'),
    ]

    for from_code, to_code in needed:
        if (from_code, to_code) not in installed:
            for pkg in available:
                if pkg.from_code == from_code and pkg.to_code == to_code:
                    print(f"Installing {from_code}->{to_code}...")
                    try:
                        download_path = pkg.download()
                        argostranslate.package.install_from_path(download_path)
                        print(f"  OK")
                    except Exception as e:
                        print(f"  Failed: {e}")
                    break

    print("Package installation complete!")

# Translate function
def translate_text(text, source, target):
    """Translate text using argos translate"""
    if not ARGOS_AVAILABLE:
        return {"error": "Translation engine not available"}

    try:
        result = argostranslate.translate.translate(text, source, target)
        return {"translatedText": result}
    except Exception as e:
        return {"error": str(e)}

# Get available languages
def get_languages():
    """Get list of available languages"""
    if not ARGOS_AVAILABLE:
        return []

    installed = argostranslate.package.get_installed_packages()
    languages = {}

    for pkg in installed:
        if pkg.from_code not in languages:
            languages[pkg.from_code] = set()
        languages[pkg.from_code].add(pkg.to_code)

    result = []
    for code, targets in languages.items():
        result.append({
            "code": code,
            "name": code.upper(),
            "targets": list(targets)
        })

    return result


class TranslateHandler(BaseHTTPRequestHandler):
    """HTTP request handler for translation API"""

    def do_GET(self):
        """Handle GET requests"""
        path = urlparse(self.path).path

        if path == '/languages':
            languages = get_languages()
            self.send_json(languages)

        elif path == '/health':
            self.send_json({"status": "ok", "engine": "argos-translate"})

        else:
            self.send_error(404, "Not found")

    def do_POST(self):
        """Handle POST requests"""
        path = urlparse(self.path).path

        if path == '/translate':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                q = data.get('q', '')
                source = data.get('source', 'en')
                target = data.get('target', 'id')

                # Handle batch translation (list of texts)
                if isinstance(q, list):
                    results = []
                    for text in q:
                        result = translate_text(text, source, target)
                        results.append(result)
                    self.send_json(results)
                else:
                    result = translate_text(q, source, target)
                    self.send_json(result)

            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
        else:
            self.send_error(404, "Not found")

    def send_json(self, data):
        """Send JSON response"""
        response = json.dumps(data).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format, *args):
        """Log requests"""
        print(f"[{self.log_date_time_string()}] {format % args}")


def get_local_ip():
    """Get local IP address"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"


def main():
    """Main function"""
    print("=" * 50)
    print("LibreTranslate Local Server")
    print("=" * 50)

    # Install packages
    install_packages()

    # Get local IP
    local_ip = get_local_ip()
    port = 5000

    print(f"\nServer starting...")
    print(f"  Local:   http://localhost:{port}")
    print(f"  Network: http://{local_ip}:{port}")
    print(f"\nAdd this URL in OpenToon Settings:")
    print(f"  http://{local_ip}:{port}")
    print(f"\nPress Ctrl+C to stop")

    # Start server
    server = HTTPServer(('0.0.0.0', port), TranslateHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == '__main__':
    main()
