---
title: "Go標準パッケージコードリーディング：go/tokenパッケージ"
created_at: "2023/08/24"
updated_at: "2023/08/24"
tags: [go]
publish: false
---

go言語のバージョン1.21がリリースされたので、これを機に標準パッケージのコードを色々読んでいこうと思います。

今回は `go/token` パッケージのコードを読んでいきたいと思います。

[go1.21.0/src/go/token](https://github.com/golang/go/tree/go1.21.0/src/go/token)

---

## go/tokenパッケージとは

`go/token` パッケージは、`go/scanner` や `go/ast` などのコード解析パッケージ内で、字句解析時に生成する各トークンの定義などを行っている。

---

## go/tokenパッケージのファイル構成

`go/token` パッケージは下記のファイルとそれらのテストで構成されている。

- token.go
    - `Token` 構造体と実際の各トークンを表現する定数の定義、 `IsLiteral` などのトークンを判定する関数定義
- position.go
    - `File` , `FileSet` , `Position` などの構造体の定義
- serialize.go
    - `serializedFile` , `serializedFileSet` 関連の処理定義

---

## token.go

token.goには、下記のような `Token` 構造体が定義されていて、

```go
// Token is the set of lexical tokens of the Go programming language.
type Token int
```

[go1.21.0/src/go/token/token.go#L16](https://github.com/golang/go/blob/go1.21.0/src/go/token/token.go#L16)

その `Token` 構造体型を用いた `iota` での連番定数として、各トークンが定義されている。

```go
// The list of tokens.
const (
	// Special tokens
	ILLEGAL Token = iota
	EOF
	COMMENT

	literal_beg
	// Identifiers and basic type literals
	// (these tokens stand for classes of literals)
	IDENT  // main
	INT    // 12345
	FLOAT  // 123.45
	IMAG   // 123.45i
	CHAR   // 'a'
	STRING // "abc"
	literal_end
...
)
```

[go1.21.0/src/go/token/token.go#L19](https://github.com/golang/go/blob/go1.21.0/src/go/token/token.go#L19)

これらの各トークンとGo言語のコード内で用いられるキーワードが下記のようなかんじで対応している。

- 変数名や関数名など = `IDENT`
- `+` 演算子 = `ADD`
- 繰り返し処理などで使用する `break` = `BREAK`

### 連番であることを活かした判定

`Token` 構造体にはそのトークンがどういった種類なのかを判定する下記のメソッドが定義されている。

- `IsLiteral`
- `IsOperator`
- `IsKeyword`

前述したように、各トークンは `iota` を用いた連番定数として定義されている。
その連番定数には下記の `literal_beg` と `literal_end` のように、定数内での特定のトークンの種類の開始位置と終了位置を表す定数がある。

```go
literal_beg
// Identifiers and basic type literals
// (these tokens stand for classes of literals)
IDENT  // main
INT    // 12345
FLOAT  // 123.45
IMAG   // 123.45i
CHAR   // 'a'
STRING // "abc"
literal_end
```

[go1.21.0/src/go/token/token.go#L25-L34](https://github.com/golang/go/blob/go1.21.0/src/go/token/token.go#L25-L34)

`literal_beg` と `literal_end` もトークン同様に `iota` で連番が割り振られているため、
下記のようにこれらの開始位置と終了位置の間に存在するかどうかで、その対象のトークンの種類に該当するかを判定することができる。

```go
// IsLiteral returns true for tokens corresponding to identifiers
// and basic type literals; it returns false otherwise.
func (tok Token) IsLiteral() bool { return literal_beg < tok && tok < literal_end }
```

[go1.21.0/src/go/token/token.go#L303](https://github.com/golang/go/blob/go1.21.0/src/go/token/token.go#L303)

これはトークンの種類が増えても条件を式を修正する必要がない為、どこか自分で書くコードでも使えそうだと思った。

---

## position.go

position.goにはパッケージ外から使用することができる下記の構造体が定義されている。
これらは今後のコード解析処理の中で必ず使用されるような構造体になる。

- `File`
- `FileSet`
- `Position`

---

## File構造体

`File` 構造体は下記のかんじで定義されていて、フィールドが全てプライベートなことから、パッケージ外で直接初期化して使用することは想定されていないように思われる。
（実際内部の `mutex` を用いた `lines` と `infos` のsetterは存在するが、 `name`, `base`, `size` に関しての処理はgetterのみになる）

```go
type File struct {
	name string // file name as provided to AddFile
	base int    // Pos value range for this file is [base...base+size]
	size int    // file size as provided to AddFile

	// lines and infos are protected by mutex
	mutex sync.Mutex
	lines []int // lines contains the offset of the first character for each line (the first entry is always 0)
	infos []lineInfo
}
```

[go1.21.0/src/go/token/position.go#L96](https://github.com/golang/go/blob/go1.21.0/src/go/token/position.go#L96)

### 何を表している構造体なのか

口述する `FileSet` 構造体の `AddFile` メソッド内で初期化されており、トークン化をする対象のファイルを表している構造体。

各フィールドはそれぞれ下記のような役割を担っている。

- `name`
    - 対象ファイルの名前
- `base`
    - `FileSet` 構造体の `AddFile` メソッド内で設定される対象ファイルの開始位置
- `size`
    - 対象ファイルのサイズ
- `mutex`
    - `lines` と `infos` を複数のgoroutineで同期的に扱う際に使用される `sync.Mutex`
- `lines`
    - 対象ファイル内の各行の最初の文字のoffset値
- `infos`
    - `lineInfo` 構造体で表現される詳細な行情報

---

## FileSet構造体

`FileSet` 構造体は下記のかんじで定義されている。

```go
type FileSet struct {
	mutex sync.RWMutex         // protects the file set
	base  int                  // base offset for the next file
	files []*File              // list of files in the order added to the set
	last  atomic.Pointer[File] // cache of last file looked up
}
```

[go1.21.0/src/go/token/position.go#L384](https://github.com/golang/go/blob/go1.21.0/src/go/token/position.go#L384)

### 何を表している構造体なのか

`FileSet` 構造体は、トークン化対象の `File` 構造体の一覧で、各フィールドはそれぞれ下記のような役割を担っている。

- `mutex`
    - 各フィールドを操作する際に使用される `sync.Mutex`
- `base`
    - 次のFileを追加する際のbaseの値
- `files`
    - 追加された `File` 構造体のポインタ一覧
- `last`
    - 最後に追加された `File` 構造体のポインタ

### FileSet構造体にFile構造体を追加する

トークン化対象の文字列をFileSet構造体にFile構造体として追加する流れを見ていく。

まず、 `FileSet` 構造体の初期化は下記の `NewFileSet` 関数で行われる。

```go
func NewFileSet() *FileSet {
	return &FileSet{
		base: 1, // 0 == NoPos
	}
}
```

[go1.21.0/src/go/token/position.go#L392](https://github.com/golang/go/blob/go1.21.0/src/go/token/position.go#L392)

これによって、下記のようにbaseの値が設定された `FileSet` 構造体は初期化することができる。

```go
fset := token.NewFileSet()
fmt.Printf("file.Base() : %d", fset.Base())
// file.Base() : 1
```

トークン化対象の `File` 構造体の追加には、下記の `AddFile` メソッドを使用する。

処理の流れとしては下記のかんじで、引数を基にbaseの値を更新しながら新しい `File` 構造体のインスタンスを生成する。

1. 引数を使用して `File` 構造体の `name` , `size` , `lines` を指定して初期化する
2. 引数baseの値をそれぞれ確認・ `File` 構造体のbaseの値を更新
    - baseの値が0の場合、 `FileSet` 構造体に設定されているbaseの値で更新
    - baseの値が `FileSet` 構造体に設定されているbaseの値より小さい場合panicを発生させる（＝ baseの値は常に元々のbaseの値以上である必要がある）
3. `FileSet` 構造体のbaseの値を、 `引数のbase + 引数のsize + 1` で更新する。
4. 生成した `File` 構造体を基に `FileSet` 構造体の `files` と `last` を更新する。

```go
func (s *FileSet) AddFile(filename string, base, size int) *File {
	// Allocate f outside the critical section.
	f := &File{name: filename, size: size, lines: []int{0}}

	s.mutex.Lock()
	defer s.mutex.Unlock()
	if base < 0 {
		base = s.base
	}
	if base < s.base {
		panic(fmt.Sprintf("invalid base %d (should be >= %d)", base, s.base))
	}
	f.base = base
	if size < 0 {
		panic(fmt.Sprintf("invalid size %d (should be >= 0)", size))
	}
	// base >= s.base && size >= 0
	base += size + 1 // +1 because EOF also has a position
	if base < 0 {
		panic("token.Pos offset overflow (> 2G of source code in file set)")
	}
	// add the file to the file set
	s.base = base
	s.files = append(s.files, f)
	s.last.Store(f)
	return f
}
```

[go1.21.0/src/go/token/position.go#L422](https://github.com/golang/go/blob/go1.21.0/src/go/token/position.go#L422)

これによって、下記のように引数で指定した値を基に `File` 構造体を初期化することができる。

```go
	src := `package main

import (
	"fmt"
)

func main() {
	fmt.Println(100)
}
`
	fmt.Printf("len(src) : %#v\n", len(src))
	// len(src) : 67

	file := fset.AddFile("main.go", -1, len(src))

	fmt.Printf("file : %#v", file)
	// file : &token.File{name:"main.go", base:1, size:67, mutex:sync.Mutex{state:0, sema:0x0}, lines:[]int{0}, infos:[]token.lineInfo(nil)}
```

`AddFile` メソッドの第二引数に `-1` を割り振ること方法は [go/parserパッケージ内のparser構造体の初期化](https://github.com/golang/go/blob/master/src/go/parser/parser.go#L70)などで使用されている。

---

## Position構造体

`Position` 構造体は下記のかんじで定義されている。

```go
type Position struct {
	Filename string // filename, if any
	Offset   int    // offset, starting at 0
	Line     int    // line number, starting at 1
	Column   int    // column number, starting at 1 (byte count)
}
```

[go1.21.0/src/go/token/position.go#L21](https://github.com/golang/go/blob/go1.21.0/src/go/token/position.go#L21)

### 何を表している構造体なのか

各フィールドは下記のように指定ファイル内の位置情報を表している。

`Position` 構造体を使用することで、静的コード解析時のエラー箇所の指定などが分かりやすくなる。

```go
fset := token.NewFileSet()
fmt.Printf("fset : %#v\n\n", fset)

src1 := "var a = 100"
src2 := "func b () int { return 200 }"
src3 := "var c = []int{0, 1, 2}"

fmt.Printf("len(src1) : %#v\n", len(src1))
fmt.Printf("len(src2) : %#v\n", len(src2))
fmt.Printf("len(src3) : %#v\n", len(src3))
// len(src1) : 11
// len(src2) : 28
// len(src3) : 22

fset.AddFile("file_1", -1, len(src1))
fset.AddFile("file_2", -1, len(src2))
fset.AddFile("file_3", -1, len(src3))

fmt.Printf("fset.Position(10) : %v\n", fset.Position(token.Pos(10)))
// fset.Position(10) : file_1:1:10

fmt.Printf("fset.Position(20) : %v\n", fset.Position(token.Pos(20)))
// fset.Position(20) : file_2:1:8

fmt.Printf("fset.Position(52) : %v\n", fset.Position(token.Pos(52)))
// fset.Position(52) : file_3:1:11
```

---

## serialize.go

serialize.goには、 `FileSet` 構造体の `Read` と `Write` メソッドとその中で使用されている `serializedFile` と `serializedFileSet` 構造体というシンプルな内容になっている。

### Read

`Read` メソッドを使用すると、decode処理によって `FileSet` 構造体の値を設定することができる。

下記はdecode処理内でjsonデコーダーを使用することで、jsonの文字列の内容を `Read` メソッド内部で定義されている `serializedFileSet` 構造体に設定している。

`Read` メソッド内では、`serializedFileSet` 構造体の内容を基に `FileSet` 構造体のフィールド値を更新するため、`fset.Read` 実行後のbase値などがjson文字列で記載した内容に更新される。

```go
fset := token.NewFileSet()

src1 := "var a = 100"
src2 := "func b () int { return 200 }"
src3 := "var c = []int{0, 1, 2}"

fset.AddFile("file_1", -1, len(src1))
fset.AddFile("file_2", -1, len(src2))
fset.AddFile("file_3", -1, len(src3))

fmt.Printf("before fset.Base() : %#v\n", fset.Base())
fmt.Printf("before fset.File(1) : %#v\n", fset.File(1))
fmt.Printf("before fset.File(13) : %#v\n", fset.File(13))
fmt.Printf("before fset.File(42) : %#v\n", fset.File(50))
// before fset.Base() : 65
// before fset.File(1) : &token.File{name:"file_1", base:1, size:11, mutex:sync.Mutex{state:0, sema:0x0}, lines:[]int{0}, infos:[]token.lineInfo(nil)}
// before fset.File(13) : &token.File{name:"file_2", base:13, size:28, mutex:sync.Mutex{state:0, sema:0x0}, lines:[]int{0}, infos:[]token.lineInfo(nil)}
// before fset.File(42) : &token.File{name:"file_3", base:42, size:22, mutex:sync.Mutex{state:0, sema:0x0}, lines:[]int{0}, infos:[]token.lineInfo(nil)}

jstr := `{
"Base": 42,
"Files": [
	{
		"Name": "file_1",
		"Base": 1,
		"Size": 11,
		"Lines": [
			0
		],
		"Infos": null
	},
	{
		"Name": "file_2",
		"Base": 13,
		"Size": 28,
		"Lines": [
			0
		],
		"Infos": null
	}
]
}`
bufR := bytes.NewBufferString(jstr)
decode := func(x any) error {
	return json.NewDecoder(bufR).Decode(x)
}
fset.Read(decode)

fmt.Printf("after fset.Base() : %#v\n", fset.Base())
fmt.Printf("after fset.File(1) : %#v\n", fset.File(1))
fmt.Printf("after fset.File(13) : %#v\n", fset.File(13))
fmt.Printf("after fset.File(42) : %#v\n", fset.File(50))
// after fset.Base() : 42
// after fset.File(1) : &token.File{name:"file_1", base:1, size:11, mutex:sync.Mutex{state:0, sema:0x0}, lines:[]int{0}, infos:[]token.lineInfo(nil)}
// after fset.File(13) : &token.File{name:"file_2", base:13, size:28, mutex:sync.Mutex{state:0, sema:0x0}, lines:[]int{0}, infos:[]token.lineInfo(nil)}
// after fset.File(42) : (*token.File)(nil)
```

### Write

`Write` メソッドを使用することで、 `FileSet` 構造体を指定したencode処理で扱うことができる。

下記はencode処理内でjsonのエンコーダーを使用することで、`FileSet` 構造体の内容をjson形式で出力している。

```go
fset := token.NewFileSet()
fmt.Printf("fset : %#v\n\n", fset)

src1 := "var a = 100"
src2 := "func b () int { return 200 }"
src3 := "var c = []int{0, 1, 2}"

fset.AddFile("file_1", -1, len(src1))
fset.AddFile("file_2", -1, len(src2))
fset.AddFile("file_3", -1, len(src3))

var buf bytes.Buffer
encode := func(x any) error {
	return json.NewEncoder(&buf).Encode(x)
}

fset.Write(encode)

fmt.Println(buf.String())
// {"Base":65,"Files":[{"Name":"file_1","Base":1,"Size":11,"Lines":[0],"Infos":null},{"Name":"file_2","Base":13,"Size":28,"Lines":[0],"Infos":null},{"Name":"file_3","Base":42,"Size":22,"Lines":[0],"Infos":null}]}
```

### encodeとdecodeの型指定

[*FileSet.Read](https://github.com/golang/go/blob/go1.21.0/src/go/token/serialize.go#L22) と [*FileSet.Write](https://github.com/golang/go/blob/go1.21.0/src/go/token/serialize.go#L49) の処理を読んでいた時に、それぞれが引数にとる `encode` 関数と `decode` 関数は、処理の流れ的に引数として `serializedFileSet` 型を受け取ることになるが、何故型指定が `func(any) error` なのか不思議だった。

ただ、下記のようなencodingパッケージでは、 今回の `Read` と `Write` メソッド同様に、引数の `encode` と `decode` は型指定が `func(any) error` になっていたので、Goという言語内で統一されている部分であり、これらencodingパッケージとの利用を示唆しているのかもと思った。

- [go1.21.0/src/encoding/json/stream.go#L49](https://github.com/golang/go/blob/go1.21.0/src/encoding/json/stream.go#L49)
- [go1.21.0/src/encoding/xml/marshal.go#L169](https://github.com/golang/go/blob/go1.21.0/src/encoding/xml/marshal.go#L169)
- [go1.21.0/src/encoding/gob/encoder.go#L175](https://github.com/golang/go/blob/go1.21.0/src/encoding/gob/encoder.go#L175)

---

## まとめ

直接使うというよりかは、 記載したように `go/scanner` や `go/ast` など関連するコード解析パッケージ内で使用されるパッケージだったが、
token.go内でのiotaの使い方やserialize.goでの引数 `encode` と `decode` の型指定など、コードとして学びの多い内容だった。
