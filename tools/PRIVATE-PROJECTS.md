# Prywatne projekty — v2

Aktualna instrukcja: [docs/private-access.md](../docs/private-access.md).

Używamy czasowych haseł sprawdzanych przez Netlify Functions oraz niepublicznego magazynu Netlify Blobs. TAURON nadal jest publiczny. Stary tryb `private-projects.py build` jest wyłączony; przygotuj prywatny pakiet narzędziem `prepare-private.py` i wgraj go w panelu właściciela. Źródła i pakiet muszą pozostać poza repozytorium i publicznym katalogiem strony.
