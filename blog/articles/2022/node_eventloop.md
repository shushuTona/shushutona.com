---
title: "Node.js イベントループについて"
created_at: "2022/07/19"
updated_at: "2022/07/19"
tags: [Node.js]
publish: true
---

Node.jsのイベントループについて調べたので、マルチスレッドでの並行処理とその問題点、イベントループでの並行処理とイベントループの進行方法についてまとめる。

## マルチスレッドでの並行処理

マルチスレッドは、ブロッキングI/Oの待ち時間に実行対象を他のスレッドに切り替えることで、並行処理を実現している。

マルチスレッドでは、コード側でスレッドセーフ（対象のコードを複数のスレッドが並行処理で実行しても問題ないようにコードを記述すること）を意識する必要がある。

### スレッド

処理の実行コンテキスト。メモリを消費する。
スレッドは、同一プロセス上のスレッドとメモリを共有するが、スレッド毎にスタックという独立したメモリ領域を持っている。

### ブロッキングI/O

プログラムの進行を一時停止させるような時間のかかるI/O処理

## マルチスレッドの問題

1リクエストに1スレッドを生成するWebサーバーでは、接続するクライアントが1万くらいまで増えると、レスポンス性能が著しく低下してしまう。

また、複数の接続が発生する場合、スレッドの切り替え（コンテキストスイッチ）が頻繫に発生してしまう為、この切り替えでも性能に影響が発生する。

## イベントループ（シングルスレッド）での並行処理

マルチスレッドはブロッキングI/Oのタイミングでスレッドを切り替えることで並行処理を実現していた。

イベントループは、シングルスレッドで実行される。
ただ、ブロッキングI/Oをシングルスレッドで対応すると、その処理が完了するまで処理全体が止まってしまう。

そこでイベントループは

- 実行すべきタスクをキューに積み、1つずつ取り出して実行する。（タスクは、一連のI/Oの発生するタイミングを境に分割されている）
- その際、完了後に実行するタスクを指定して対象処理を実行して、アプリケーションの進行を先に進める。（`ノンブロッキングI/O`）

という方式で、シングルスレッドでありながら並行処理を実現している。

また、マルチスレッド側では考慮する必要があったスレッドセーフをイベントループでは意識する必要はない。

### ノンブロッキングI/O

時間がかかるがプログラムの進行を停止させないI/O処理。

### CPU負荷が高い処理

イベントループでCPU負荷が高いタスクを実行すると、そのタスクが完了するまで後続のタスクが実行されない。
CPU負荷が高い処理はマルチスレッドでの並行処理で対応するべき。

## イベントループのフェーズ

イベントループには、下記の6つのフェーズが存在して、各フェーズはFIFOのキューを持っている。

- timers
- pending callbacks
- idle, prepare
- poll
- check
- close callbacks

イベントループが各フェーズに入ると、そのフェーズのキューに溜まっているコールバックを実行して、キューに溜まっているコールバックを実行し終えると、次のフェーズに移動する。

### timers

`setTimeout()` と `setInterval()` で登録されたコールバックを実行するフェーズ。
イベントループの開始フェーズ。

### pending callbacks

完了・エラーしたI/O処理のコールバックを実行するフェーズ。

### idle, prepare

内部的な処理を実行するフェーズ。

### poll

新しいI/Oイベントの取得＆I/O関連のコールバックを実行するフェーズ。
（※ close処理のコールバック、timerに設定されたコールバック、`setImmediate()`以外のコールバック）

pollフェーズに入った際に、タイマーが設定されていなかった場合、下記のどちらかを実行する。

- pollフェーズのキューが空で無い場合、キューに存在するコールバックを同期的に実行する。
- pollフェーズのキューが空の場合、
    - `setImmediate()` によって処理が設定されていたら、イベントループはpollフェーズを終了して、`check`フェーズに移動して処理を実行する。
    - `setImmediate()` によって処理が設定されていなかったら、イベントループはpollフェーズにコールバックが追加されるのを待機する。

pollフェーズのキューが空になったら、イベントループは設定した時間に達したtimerをチェックして、時間が達している処理が存在する場合、イベントループはtimersフェーズに戻って処理を実行する。

### check

`setImmediate()` で登録されたコールバックを実行するフェーズ。

pollフェーズが完了した後に、実行するコールバックをlibuv APIでスケジュールする。

### close callbacks

closeイベントを処理するフェーズ。

## libuv

Node.jsのイベントループと全ての非同期動作を実装するC言語ライブラリ。

## nextTickQueue と microTaskQueue

libuvが提供しているイベントループの一部ではない、`nextTickQueue`と`microTaskQueue`が存在する。
この2つのキューにコールバックが存在する場合、各フェーズ終了後にイベントループが次のフェーズに移る前に、登録されているコールバックが全て処理される。

また、`timers`や`check`のキューにコールバックが残っていた場合でも、各`setTimeout`・`setImmediate`の間に存在する`process.nextTick`や`Promise`コールバックは先に実行される。

```javascript
setImmediate( () => console.log( 'immediate1' ) );
setImmediate( () => {
    console.log( 'immediate2' )
    Promise.resolve().then( () => console.log( 'promise resolve' ) )
    process.nextTick( () => console.log( 'next tick' ) )
} );
setImmediate( () => console.log( 'immediate3' ) );

// output
//
// immediate1
// immediate2
// next tick
// promise resolve
// immediate3
```

### nextTickQueue

`process.nextTick()`で登録した処理が登録され、各フェーズの処理完了後に`nextTickQueue`で実行される。

### microTaskQueue

Promiseのコールバックが登録され、`nextTickQueue`の後に`microTaskQueue`に登録された処理が実行される。

## 参考

- [The Node.js Event Loop, Timers, and process.nextTick()](https://nodejs.org/ja/docs/guides/event-loop-timers-and-nexttick/)
- [Timers, Immediates and Process.nextTick](https://blog.insiderattack.net/timers-immediates-and-process-nexttick-nodejs-event-loop-part-2-2c53fd511bb3)
- [Handling IO](https://blog.insiderattack.net/handling-io-nodejs-event-loop-part-4-418062f917d1)
- [New Changes to the Timers and Microtasks in Node v11.0.0 ( and above)](https://blog.insiderattack.net/new-changes-to-timers-and-microtasks-from-node-v11-0-0-and-above-68d112743eb3)
- [Node.js event loop workflow & lifecycle in low level](https://www.voidcanvas.com/nodejs-event-loop)
