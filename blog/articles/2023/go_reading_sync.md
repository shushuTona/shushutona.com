---
title: "Go標準パッケージコードリーディング：syncパッケージ【Mutex編】"
created_at: "2023/08/14"
updated_at: "2023/08/14"
tags: [go]
publish: true
---

go言語のバージョン1.21がリリースされたので、これを機に標準パッケージのコードを色々読んでいこうと思います。

今回は `sync` パッケージの `mutex.go` のコードを読んでいきたいと思います。

[go1.21.0/src/sync/mutex.go](https://github.com/golang/go/tree/go1.21.0/src/sync/mutex.go)

## Mutexの基本的な使い方

`Mutex` は `Lock` メソッドと `Unlock` メソッドを使用することで下記のような排他制御を行うことができる。
（※ Mutexだけの使用を記述する為に、意図的に `time.Sleep` で `goroutine` の終了を待たせています）

mutex.goには、`Mutex` 構造体とそのメソッドの定義が記述されている。

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

type Count struct {
	sum int
	m   sync.Mutex
}

func (c *Count) Add() {
	c.m.Lock()
	defer c.m.Unlock()

	c.sum += 1

	fmt.Printf("sum : %d\n", c.sum)
}

func main() {
	count := Count{}
	for i := 1; i <= 10; i++ {
		go count.Add()
	}

	time.Sleep(time.Second * 3)
}
```

実行結果

```Shell
sum : 1
sum : 2
sum : 3
sum : 4
sum : 5
sum : 6
sum : 7
sum : 8
sum : 9
sum : 10
```

## Locker interface

`sync` パッケージには下記のような `Locker` インターフェースが定義されており、 `Mutex` はこのインターフェースを満たすように実装されている。

[](https://github.com/golang/go/blob/go1.21.0/src/sync/mutex.go#L40)

```go
type Locker interface {
	Lock()
	Unlock()
}
```

この `Locker` インターフェースは、下記のような他パッケージ内でも使用されている。

- [go1.21.0/src/net/http/transport.go#L2562](https://github.com/golang/go/blob/go1.21.0/src/net/http/transport.go#L2562)
- [go1.21.0/src/database/sql/sql.go#L661](https://github.com/golang/go/blob/go1.21.0/src/database/sql/sql.go#L661)

## Mutex

`Mutex` 構造体は下記のように定義されており、`state` と `sema` はそれぞれ初期値の `0` になる。
これらのフィールド値が0の状態の `Mutex` はロックが解除されていることになる。

[go1.21.0/src/sync/mutex.go#L34](https://github.com/golang/go/blob/go1.21.0/src/sync/mutex.go#L34)

```go
type Mutex struct {
	state int32
	sema  uint32
}
```

## Lock

`Lock` メソッドは下記のかんじでシンプルな処理の流れになっている。

1. `atomic.CompareAndSwapInt32` 実行して、`m.state` の値が `0` の場合 `m.state` の値を `mutexLocked` で更新する。
    - `race.Enabled` が `true` の場合、`race.Acquire(unsafe.Pointer(m))` を実行する。
2. 1の処理に該当しなかった場合、 `lockSlow` メソッドを実行する。

`mutexLocked` は `sync` パッケージに定義されている定数で値としては `1` になるため、
`m.state` の値が `0` である場合ロックが解除されていて、 `1` の場合ロック状態ということになる。

[go1.21.0/src/sync/mutex.go#L46](https://github.com/golang/go/blob/go1.21.0/src/sync/mutex.go#L46)

```go
mutexLocked = 1 << iota // mutex is locked
mutexWoken
mutexStarving
mutexWaiterShift = iota
```

※ これら定数の値はビット演算子と `iota` を使用していて少し複雑に見えるが、下記の値になる。

```go
mutexLocked = 1 << 0 // = 1
mutexWoken = 1 << 1 // = 10 = 2
mutexStarving = 1 << 2 // = 100 = 4
mutexWaiterShift = 3
```

### race.Enabled

`Lock` メソッドの中には `race.Enabled` を確認する判定が存在する。

`race.Enabled` の値は `internal/race` パッケージ内の下記で定義されている。

- [go1.21.0/src/internal/race/race.go#L15](https://github.com/golang/go/blob/go1.21.0/src/internal/race/race.go#L15)
- [go1.21.0/src/internal/race/norace.go#L14](https://github.com/golang/go/blob/go1.21.0/src/internal/race/norace.go#L14)

`internal/race` パッケージは `-race` オプションを実行やビルド時に付与した際に `race.go` の内容を使用することになるため、通常実行時の `race.Enabled` の判定は `false` になる。
（ `-race` オプション自体は、 [Data Race Detector](https://go.dev/doc/articles/race_detector) という、複数のgoroutinesが1つの同じ変数を操作する際の競合を検知する機能を有効にするオプション）

## lockSlow

既にロック状態の `Mutex` が再度 `Lock` メソッドを実行した際に `lockSlow` メソッドが実行される。

`lockSlow` メソッドは下記の処理の流れになる。

1. XXX
2. XXX
3. XXX

## Unlock

`Unlock` メソッドは下記の流れになっているので、ロック状態からロック解除した場合2の処理で `m.state` の値が `0` になって処理が終了する。

1. `race.Enabled` の判定（＝通常実行時 `false` ）
2. `atomic.AddInt32` で `m.state` に `-mutexLocked` 加算（＝-1加算）する。
3. 2の加算結果が `0` でなかった場合（＝ロック解除状態にならなかった場合）、`unlockSlow` メソッドを実行する。

## unlockSlow

ロック解除状態で `Unlock` メソッドを実行した際などに、 `Unlock` メソッド内で `unlockSlow` メソッドが実行される。

`unlockSlow` メソッドは下記の処理の流れになる。

1. `(new+mutexLocked)&mutexLocked` の値が `0` の場合 `fatal` 関数を実行してfatal errorを発生させる。
2. `new&mutexStarving` の値によって下記をそれぞれ実行する。
    - `new&mutexStarving` の値が `0` の場合
        1. XXX
        2. XXX
        3. XXX
    - `new&mutexStarving` の値が `0` でない場合、 `runtime_Semrelease` を実行する。
