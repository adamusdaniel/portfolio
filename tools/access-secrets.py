#!/usr/bin/env python3
"""Generate Netlify settings locally; no secrets are written to the repository."""
import getpass
import hashlib
import secrets
password=getpass.getpass('Nowe hasło właściciela (minimum 16 znaków): ')
if len(password)<16: raise SystemExit('Użyj minimum 16 znaków; zapisz hasło w menedżerze haseł.')
if getpass.getpass('Powtórz hasło: ')!=password: raise SystemExit('Hasła nie są identyczne.')
salt=secrets.token_hex(16)
hash_value=hashlib.scrypt(password.encode(),salt=salt.encode(),n=16384,r=8,p=1,dklen=64).hex()
print('\nSkopiuj poniższe wartości WYŁĄCZNIE do ustawień Netlify. Nie wklejaj ich do czatu ani Git.\n')
print('ACCESS_OWNER_PASSWORD_HASH=scrypt:'+salt+':'+hash_value)
print('ACCESS_SESSION_SECRET='+secrets.token_urlsafe(32))
print('ACCESS_STORE=portfolio-private-v2')
