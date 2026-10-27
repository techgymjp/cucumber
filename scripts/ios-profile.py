"""App Store 配布用のプロビジョニングプロファイルを用意する（GitHub Actions の iOS アップロードで使う）。

App Store Connect API（Secrets の API キー）を使い、
  1. Bundle ID と、Secrets の証明書（.p12）に対応する配布用の証明書を探す
  2. 同じ名前の有効なプロファイルがあれば使い回し、なければ作る
  3. Mac の所定の場所にプロファイルを保存し、名前を GITHUB_ENV に書き出す

環境変数：ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH（.p8 のパス）/ P12_PATH / P12_PASSWORD /
          BUNDLE_ID / PROFILE_NAME
必要なライブラリ：pyjwt, cryptography
"""
import base64
import json
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt
from cryptography.hazmat.primitives.serialization import pkcs12

API = 'https://api.appstoreconnect.apple.com/v1'
env = os.environ


def token():
    key = pathlib.Path(env['ASC_KEY_PATH']).read_text()
    now = int(time.time())
    payload = {'iss': env['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 15 * 60, 'aud': 'appstoreconnect-v1'}
    return jwt.encode(payload, key, algorithm='ES256', headers={'kid': env['ASC_KEY_ID'], 'typ': 'JWT'})


TOKEN = token()


def call(method, path, body=None, query=None):
    url = API + path + ('?' + urllib.parse.urlencode(query) if query else '')
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req) as res:
            text = res.read().decode()
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{method} {path} failed: {e.code} {e.read().decode()}')


bundle_id = env['BUNDLE_ID']
profile_name = env['PROFILE_NAME']

# 1. Bundle ID
bundles = call('GET', '/bundleIds', query={'filter[identifier]': bundle_id, 'limit': '200'})['data']
bundle = next((b for b in bundles if b['attributes']['identifier'] == bundle_id), None)
if not bundle:
    raise SystemExit(f'Bundle ID {bundle_id} is not registered in Apple Developer (Identifiers).')

# 2. Secrets の証明書に対応する配布用の証明書（シリアル番号で照合する）
_, cert, _ = pkcs12.load_key_and_certificates(
    pathlib.Path(env['P12_PATH']).read_bytes(), env['P12_PASSWORD'].encode())
serial = cert.serial_number
certs = call('GET', '/certificates', query={'filter[certificateType]': 'DISTRIBUTION,IOS_DISTRIBUTION', 'limit': '200'})['data']
match = next((c for c in certs if int(c['attributes']['serialNumber'], 16) == serial), None)
if not match:
    raise SystemExit('The distribution certificate in IOS_DIST_CERT_P12_BASE64 was not found in Apple Developer.')
cert_id = match['id']

# 3. プロファイル：同じ名前で有効、かつこの証明書を含むものは使い回す。古いものは消して作り直す
profile = None
for p in call('GET', '/profiles', query={'filter[name]': profile_name, 'limit': '200'})['data']:
    ids = [c['id'] for c in call('GET', f"/profiles/{p['id']}/certificates")['data']]
    if p['attributes']['profileState'] == 'ACTIVE' and cert_id in ids and profile is None:
        profile = p
    else:
        call('DELETE', f"/profiles/{p['id']}")
if profile is None:
    profile = call('POST', '/profiles', body={'data': {
        'type': 'profiles',
        'attributes': {'name': profile_name, 'profileType': 'IOS_APP_STORE'},
        'relationships': {
            'bundleId': {'data': {'type': 'bundleIds', 'id': bundle['id']}},
            'certificates': {'data': [{'type': 'certificates', 'id': cert_id}]},
        },
    }})['data']
    print(f'Created provisioning profile "{profile_name}"')
else:
    print(f'Reusing provisioning profile "{profile_name}"')

attrs = profile['attributes']
dest = pathlib.Path.home() / 'Library/MobileDevice/Provisioning Profiles'
dest.mkdir(parents=True, exist_ok=True)
(dest / f"{attrs['uuid']}.mobileprovision").write_bytes(base64.b64decode(attrs['profileContent']))
with open(env['GITHUB_ENV'], 'a') as f:
    f.write(f"PROFILE_UUID={attrs['uuid']}\n")
