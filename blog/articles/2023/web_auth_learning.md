---
title: "webアプリケーションの認証方法について"
created_at: "2023/02/17"
updated_at: "2023/02/17"
tags: [auth]
publish: true
---

業務でログイン機能を持ったWebサービスを扱っているが、

- 実際どのような認証方法が存在するのか
- それぞれがどのような仕組みで認証を行っているのか

という部分への理解が浅いと感じた為、それらを調べてまとめる。

## 認証にはどのような方法が存在するのか

今回は下記の認証方式の方法と考慮する点などを確認していく。

- Basic Authentication
- Digest Authentication
- Session based Authentication
- Token based Authentication

## 確認環境

各認証方式を実装したdockerコンテナ（`Go 1.19` & `gin`）へ `nginx` がproxyでリクエストを振り分ける、という構成をローカル環境で作成して確認。

- [実装したコード](https://github.com/shushuTona/try_web_auth_go)

## Basic Authentication

ベーシック認証は、ブラウザのプロンプトにユーザー名とパスワードを入力することで認証する認証方式。

### 認証の流れ

1. クライアントが未認証で認証が必要なURLへリクエストを送る。
2. サーバーは、`Basic` という値を持った `WWW-Authenticate` をレスポンスheaderに設定して、Status Code `401 Unauthorized`でレスポンスを返す。
3. クライアント側では、ユーザー名とパスワードを入力するプロンプトが表示される。
4. プロンプトにユーザー名とパスワードを入力することで、`user:pass`という形式の文字列を `base64` エンコードした文字列を、リクエストheaderの `Authorization: Basic` に設定して、再度 `1` でリクエストしたURLへリクエストを送信する。

![](https://testdriven.io/static/images/blog/web-authentication-methods/basic_auth.png)

### 利点

- 実装が簡単

### 考慮・懸念事項

- ユーザー名とパスワードがbase64エンコードされるだけで暗号化されていない。
- 認証時にプロンプトへの入力が必要になる。

## Digest Authentication

ダイジェスト認証は、前述のベーシック認証と認証の流れは似ているが、パスワードをサーバーに送信する際に `MD5` という形式でパスワードがハッシュ化される為、セキュリティ面で優れている。

### 認証の流れ

1. クライアントが未認証で認証が必要なURLへリクエストを送る。
2. サーバーは、 `nonce` というランダム値を生成して、`nonce` と `Digest` という値を持った `WWW-Authenticate` をレスポンスheaderに設定して、Status Code `401 Unauthorized`でレスポンスを返す。
3. クライアント側では、ユーザー名とパスワードを入力するプロンプトが表示される。
4. プロンプトにユーザー名とパスワードを入力することで、ハッシュ化されたパスワードとレスポンスに含まれていた `nonce` を、リクエストheaderの `Authorization` headerに設定して、再度 `1` でリクエストしたURLへリクエストを送信する。

![](https://testdriven.io/static/images/blog/web-authentication-methods/digest_auth.png)

### 利点

- 実装が簡単
- MD5でハッシュ化されている為、ベーシック認証よりもユーザーの認証データの扱いがセキュア

### 考慮・懸念事項

- 認証時にプロンプトへの入力が必要になる。
- ハッシュ化したパスワードをサーバーで確認する都合から、パスワードがサーバー内で平文管理されることになる。

## Session based Authentication

セッションベース認証は、`session` と `cookie` を利用することで、リクエストの度に認証情報を送受信する必要を無くしている。

セッションストアとして、メモリを使用することも可能だが、サービスのスケールを考慮する場合は、RDBやRedis, Memcachedなどのキャッシュサーバーを利用するのと良い。

### 認証の流れ

1. ユーザーが認証情報をサーバーに送信する。
2. サーバーで正しく認証が完了した際に、サーバーでセッションデータを生成してセッションストアに保存。
3. 保存したセッションデータに紐づく `sessionID` を レスポンスの `cookie` に設定する。
4. レスポンスを受け取ったブラウザは、`sessionID` を `cookie` として保存して、それ以降のそのサーバーへのリクエスト時には毎回その `cookie` がリクエスト内容に付与される。

![](https://testdriven.io/static/images/blog/web-authentication-methods/session_auth.png)

### 利点

- ベーシック認証やダイジェスト認証のように、リクエスト毎にユーザーの認証情報を送受信する必要がない為、認証完了後の処理の効率が良い
- 多くのFWで機能が存在する為、実装がしやすい。

### 考慮・懸念事項

- サーバーでユーザーの認証情報を保管する必要がある。（ステートフル）

### 各脆弱性と対応方法

`cookie` を使用する場合、下記の脆弱性の可能性がある為、それぞれ対応・検討が必要。

#### セッションハイジャック

- cookieに `Secure` 属性を設定する
    - secure属性を設定したcookieはHTTPS通信でのみ利用される為

#### XSS

- cookieに `HttpOnly` 属性を設定する
    - `document.cookie`などJS経由でcookieに設定したsessionIDを取得される可能性がある為

#### CSRF

- cookieに `SameSite` 属性の`Strict` or `Lax`を設定する
    - SameSite属性として、StrictかLaxを設定することでcookieの送信を制限することができる。
- `Origin`リクエストヘッダーを確認する。
    - Originリクエストヘッダーとサーバーが稼働しているホストが同じかを確認することで、想定していないドメインからのリクエストを検知することができる。
- formの中に動的に`<input type="hidden" value="token-xxx">`を設置する。
    - sessionIDとは別にhiddenタイプで設定されたトークンを確認することができる。
- CSRFトークンを生成して cookieに `XSRF-TOKEN` として設定する
    - axiosなどのライブラリで取得処理などを行う際に、cookieに設定されたXSRF-TOKENの内容を送信することで、sessionIDとは別にサーバー側でトークンの確認を行うことができる。

## Token based Authentication

トークンベース認証は、cookieの代わりにトークンを使用する認証方法で、一般的に `JSON Web Token (JWT)` のフォーマットで実装されることが多い。

### JWTとは

[JWT](https://www.rfc-editor.org/rfc/rfc7519)は、JSON形式のデータを署名付きでやりとりすることができるトークン形式。

下記の `Header`, `Payload`, `Signature` の3つから構成されている。

#### Header

Headerは、下記の2つで構成され、`Base64Url`でエンコードされる。

- `typ`：トークンタイプ（JWT）
- `alg`：使用される署名アルゴリズム（`HMAC SHA256`, `RSA`、、など）

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

#### Payload

Payloadは、ユーザーのデータなどを扱う　`claims`（クレーム）で構成されている。

claimsは、[RFCで定義されているもの](https://www.rfc-editor.org/rfc/rfc7519#section-4.1)もあるが、ユーザーが付与したいデータを設定することができる。

下記のようなJSO形式を`Base64Url`でエンコードする。

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true
}
```

#### Signature

Signatureは、`Base64Url`でエンコードされたHeaderとPayload, secretを基に生成され、メッセージが途中で変更されていないか確認する為に使用される。
（JWTが秘密鍵で署名されている場合、送信者が本人であることの確認も行うことができる）

```txt
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret)
```

#### トークンの生成

トークンは、前述の`Base64Url`でエンコードされた`Header`, `Payload`, `Signature`
を`.`（ドット）で結合した文字列になる。

[https://jwt.io/](https://jwt.io/)

#### トークンの送受信

調べているかんじ、トークンの送受信は下記のような `Authorization header` or `cookie` で行われている。
（Authorization headerでの送受信の場合は、cookieを使用しない為、CORSの問題が発生しない。）

```txt
Authorization: Bearer <token>
```

### 認証の流れ

1. ユーザーが認証情報をサーバーに送信する。（`Payload`の項目内容）
2. 認証完了後、サーバーでトークンを生成してユーザーにレスポンスを返す。
3. ユーザーは受け取ったトークンをリクエストheaderやCookieに設定して、目的のエンドポイントにリクエストを送信する。
4. リクエストを受け取ったサーバーで、設定されているトークンの署名が正しいかを確認する。

![](https://testdriven.io/static/images/blog/web-authentication-methods/token_auth.png)

### 利点

- サーバーはユーザーから送信されるトークンの署名が正しいかの確認をするだけで良い為、セッションベース認証のようにサーバーに認証情報を保管する必要がない。（ステートレス）
    - ただ、考慮事項に記載している生成したトークンを削除できないことから、JWT内にセッションIDを含めて、JWTを改善チェックの手段として使うハイブリッドな使用方法が良いっぽい。
- セッションベース認証同様に、各言語でJWT用のライブラリが存在する為、実装がしやすい。

### 考慮・懸念事項

- 生成したトークンを削除する方法は無い（サーバー側で`jti` (JWT ID) Claimを管理するなど間接的な方法しかない）

### localstorageでのJWTの保存方法

生成したJWTをブラウザ側のlocalstorageで保存する場合、XSS脆弱性の問題がある為、利用は避けるべき。

### JWTでのセッション管理

生成したトークンを削除できない問題 & 脆弱性の観点から、長期間でのセッション管理用途としてのJWT利用は避けた方が良さそう。
（仮に生成したトークンが漏洩＆悪用された場合、JWTで使用している秘密鍵などを再度設定するなどしないとトークンを無効することができない）

## まとめ

- 1度だけの認証であれば短い有効期限を設定したJWTでの認証が良さそう。
- セッション管理を行いたい場合は、JWTで無理矢理対応するのではなく、従来通りサーバー側でセッション管理を行い、改竄などへの対策としてSessionID in JWTというような方法を検討する。という方が良さそう。

※ 下記2つを後日調べて追記する

- OAuth - Open Authorization
- SSO - Single Sign On

## 参照

- [Web Authentication Methods Compared](https://testdriven.io/blog/web-authentication-methods/)
- [JSON Web Tokens vs. Session Cookies: In Practice](https://ponyfoo.com/articles/json-web-tokens-vs-session-cookies)
- [HTTP Cookie の使用 - HTTP | MDN](https://developer.mozilla.org/ja/docs/Web/HTTP/Cookies)
- [SameSite cookies - HTTP | MDN](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Origin - HTTP | MDN](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Origin)
- [CSRFトークンがCookieに存在するという勘違い](https://turningp.jp/network_and_security/csrf-cookie)
- [今時の CSRF 対策ってなにをすればいいの？](https://tech.basicinc.jp/articles/231)
- [Introduction to JSON Web Tokens](https://jwt.io/introduction)
- [JWTでセッション管理してはいけない - Qiita](https://qiita.com/hakaicode/items/1d504a728156cf54b3f8)
- [JWTは使うべきではない　〜 SPAにおける本当にセキュアな認証方式 〜 - Qiita](https://qiita.com/nyandora/items/8174891f52ec0ea15bc1)
- ["JWT=ステートレス"から一歩踏み出すための考え方](https://zenn.dev/ritou/articles/4a5d6597a5f250)
