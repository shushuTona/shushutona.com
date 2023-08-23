---
title: "Goを通して静的コード解析を理解する"
created_at: "2023/08/15"
updated_at: "2023/08/15"
tags: [go]
publish: false
---

Goを書くことに少しずつ慣れてきた中で、静的コード解析というものでGoのソースコードを使ってGoのソースコードのチェックなどを行うことができると知った。

ただ、調べてみると、各パッケージの利用方法の以前に、コード解析についての基本的な用語理解も必要だと感じたので、それらを確認・整理しながらGoでの静的コード解析についてまとめようと思う。

---

## そもそも静的コード解析とは何か

> 静的コード解析 (せいてきコードかいせき、static code analysis) または静的プログラム解析 (static program analysis)とは、コンピュータのソフトウェアの解析手法の一種であり、実行ファイルを実行することなく解析を行うこと。

[静的コード解析 - Wikipedia](https://ja.wikipedia.org/wiki/%E9%9D%99%E7%9A%84%E3%82%B3%E3%83%BC%E3%83%89%E8%A7%A3%E6%9E%90)

プログラムコードの実行が発生しないこと = 静的 という意味らしい。
（なので、コードの実行が発生する場合、動的コード解析になる）

コードを実行しない為、実行時のメモリエラーなどを完全に検出することはできない。

---

## コード解析の文脈に登場する用語

Goでの静的コード解析の文脈では下記の用語が使われるので、これらがそれぞれ何なのか確認していく。

- **字句解析**
    - トークン
    - スキャナ
    - トークン化
- **構文解析**
    - 構文解析器（parser）
- **抽象構文木（AST）**
    - ノード

### 字句解析

> 字句解析は、コンピュータを用いた自然言語処理でも、プログラミング言語のコンパイルでも行われる。
> 自然言語の文であれ、プログラムのソースコードであれ、文というのは結局、文字や記号や約物類が多数並んだもの（文字列）であるが、字句解析はそれを、言語的に意味のある最小単位トークン（英: token(s)）に分解する処理である。

[字句解析 - Wikipedia](https://ja.wikipedia.org/wiki/%E5%AD%97%E5%8F%A5%E8%A7%A3%E6%9E%90)

`1 + 1` という文字列を例にすると、下記のように分解（トークン化）する処理を字句解析という。

| 文字列 | 型 |
| :-: | :-: |
| 1 | 数 |
| + | 演算子 |
| 1 | 数 |

#### トークン

字句解析によって生成される言語的に意味のある最小単位。

#### スキャナ

>字句解析の場合、文字列から、1個のトークンになるような部分文字列を切り出す部分をスキャナとして分けて考える場合がある。

[スキャナ : 字句解析 - Wikipedia](https://ja.wikipedia.org/wiki/%E5%AD%97%E5%8F%A5%E8%A7%A3%E6%9E%90#.E3.82.B9.E3.82.AD.E3.83.A3.E3.83.8A)

スキャナが文字列からトークンを切り出している。

#### トークン化

> トークン化は、スキャナによって得られた部分文字列に、トークンの種別の情報を付け（この部分の仕事は、実際のところスキャナによって適合するルールが選ばれた時点でほとんど済んでいる）、その種類によっては、たとえば整数ならその整数値といったような意味値（英: semantic value）を与える処理である。

[トークナイザ : 字句解析 - Wikipedia](https://ja.wikipedia.org/wiki/%E5%AD%97%E5%8F%A5%E8%A7%A3%E6%9E%90#.E3.83.88.E3.83.BC.E3.82.AF.E3.83.8A.E3.82.A4.E3.82.B6)

スキャナが切り出したトークンに情報を付与する処理。

### 構文解析

> 構文解析では、構文木や抽象構文木のようなデータ構造を生成し、プログラミング言語のコンパイラであれば、いわゆるコンパイラバックエンドに渡す。

[構文解析 - Wikipedia](https://ja.wikipedia.org/wiki/%E6%A7%8B%E6%96%87%E8%A7%A3%E6%9E%90)

字句解析で生成したトークンを基に抽象構文木を生成する処理を構文解析という。
（前述の字句解析と、そのトークン列を受け取り構文木を作るなどする処理を分けてその全体を広義の構文解析とすることもあるらしい）

※ 言語の文法的な正当性を判断することはこの段階で行うことは難しいため、そういった問題は後処理で排除する。

#### 構文解析器（parser）

> 構文解析器（こうぶんかいせきき）とは、構文解析をおこなうプログラム。パーサまたはパーザ(parser)とも。

[構文解析器 - Wikipedia](https://ja.wikipedia.org/wiki/%E6%A7%8B%E6%96%87%E8%A7%A3%E6%9E%90%E5%99%A8)

構文解析をおこなうプログラム。

### 抽象構文木（AST）

> 抽象構文木（ちゅうしょうこうぶんぎ、英: abstract syntax tree、AST）は、通常の構文木（具象構文木あるいは解析木とも言う）から、言語の意味に関係ない情報を取り除き、意味に関係ある情報のみを取り出した（抽象した）木構造の木である。

[抽象構文木 - Wikipedia](https://ja.wikipedia.org/wiki/%E6%8A%BD%E8%B1%A1%E6%A7%8B%E6%96%87%E6%9C%A8)

括弧などプログラムの構造体自体に不要なデータを省いたデータ構造。
構文木であるため、構造的に親と子の関係がある。

このASTを使うことで、構文のチェックやコードの生成などを行うことができる。

#### ノード

抽象構文木の要素

---

## どのような流れでコードを解析するのか

コード解析は下記の流れで行われる。
コンパイラなどは、下記の流れで生成した抽象構文木を基に、意味解析・中間コード生成・最適化などを行うらしい。


次からは、実際にGoにおいて

---

## Goで静的コード解析を扱う

Goにおいて下記のパッケージがそれぞれ字句解析や構文解析、抽象構文木など静的コード解析に必要な処理に対応している。

- [XXX](XXX)
- [XXX](XXX)
- [XXX](XXX)
- [XXX](XXX)
- [XXX](XXX)

これらを使用して、実際にGoで静的コード解析をやってみよう。

## Goで字句解析をしてみる

XXX

### 生成されたトークンはどのような形式なのか

XXX

## Goで構文解析をしてみる

XXX

### 生成された抽象構文木（AST）はどのような形式なのか

XXX

## Goの型情報はどのように表現されているのか

XXX

## まとめ

XXX