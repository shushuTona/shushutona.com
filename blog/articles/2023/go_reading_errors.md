---
title: "Go標準パッケージコードリーディング：errorsパッケージ"
created_at: "2023/08/11"
updated_at: "2023/08/11"
tags: [go]
publish: true
---

go言語のバージョン1.21がリリースされたので、これを機に標準パッケージのコードを色々読んでいこうと思います。

今回は `errors` パッケージのコードを読んでいきたいと思います。

[go1.21.0/src/errors](https://github.com/golang/go/tree/go1.21.0/src/errors)

---

errorsパッケージは下記ファイルから構成されているシンプルなパッケージで、

```
errors.go
errors_test.go
example_test.go
join.go
join_test.go
wrap.go
wrap_test.go
```

- errors.go
   - errorを生成する `New` 関数と構造体の定義
- join.go
   - 複数のerrorをまとめる `Join` 関数と構造体の定義
- wrap.go
   - errorの判定で利用する `Unwrap`, `Is`, `As` 関数の定義

というかんじで各処理が記述されている。

---

## errors.go

errors.goに記述されているコードは下記のエラー生成用関数 `New` と構造体 `errorString` になる。

```go
func New(text string) error {
	return &errorString{text}
}

type errorString struct {
	s string
}

func (e *errorString) Error() string {
	return e.s
}
```

構造体 `errorString` は、 [src/builtin/builtin.go](https://github.com/golang/go/tree/go1.21.0/src/builtin/builtin.go#L307) で定義されている `error` インターフェースを満たす構造体になっている。

```go
type error interface {
	Error() string
}
```

`Error() string` を実装していればerror型を満たすことになるので、下記のように独自のエラーを定義することができる。

```go
type ErrCode int

func (e ErrCode) Error() string {
	return fmt.Sprintf("error code %d", e)
}

var ERROR_CODE_404 = ErrCode(404)
var ERROR_CODE_500 = ErrCode(500)

func GetErrMsg(e error) string {
	return e.Error()
}

func main() {
	fmt.Println(GetErrMsg(ERROR_CODE_404))
    // error code 404

	fmt.Println(GetErrMsg(ERROR_CODE_500))
    // error code 500
}
```

### Unwrap

コメントアウトには、`Unwrap` メソッドが定義されているエラーは、他のエラーをラップしているエラーであると記載されていて、

```go
// An error e wraps another error if e's type has one of the methods
//
//	Unwrap() error
//	Unwrap() []error
```

下記のように `Unwrap() error` （または、 `Unwrap() []error` ）を実装することで、エラーを入れ子で扱うことができる。

```go
type WrapErr struct {
	msg string
	err error
}

func (we *WrapErr) Error() string {
	return we.msg
}

func (we *WrapErr) Unwrap() error {
	return we.err
}

func main(){
	err := errors.New("base error\n")
	err1 := &WrapErr{"wrap error 1\n", err}
	err2 := &WrapErr{"wrap error 2\n", err1}
}
```

ただ、下記のコメントアウトにも記載があるように、他のエラーをラップしているエラーを作成したい時は、 [fmtパッケージのErrorf関数](https://github.com/golang/go/tree/go1.21.0/src/fmt/errors.go#L22) を使用することで、 `Unwrap` を実装したエラーを生成することができるので、独自処理などが無ければ `fmt.Errorf` でエラーを生成すれば問題なさそうではある。

```go
// An easy way to create wrapped errors is to call [fmt.Errorf] and apply
// the %w verb to the error argument:
//
//	wrapsErr := fmt.Errorf("... %w ...", ..., err, ...)
```

Unwrapメソッドは後述する Is関数やAs関数内で使用されることになる。

---

## join.go

`Join` 関数は下記のように複数のエラーを1つのエラーにまとめることができて、 `nil` が含まれている場合は、 `nil` を除外して1つのエラーを生成する。
（引数がすべて `nil` の場合は関数の戻り値も `nil` になる）

```go
func main() {
    err1 := errors.New("error1")
	err2 := errors.New("error2")
	err3 := errors.New("error3")
	joinErr := errors.Join(err1, err2, err3)
	fmt.Println(joinErr.Error())
	// error1
	// error2
	// error3

	joinErr2 := errors.Join(err1, nil, err3)
	fmt.Println(joinErr2.Error())
	// error1
	// error3

	joinErr3 := errors.Join(nil, nil, nil)
	fmt.Println(joinErr3)
	// <nil>
}
```

パッケージに記載されているコードは下記になっていて、

1. 引数として渡された `errs` を確認して `nil` ではないエラーの件数をカウント
    - 引数がすべて `nil` の場合は関数の戻り値として `nil` を返して処理終了
2. 前段で数えたエラーの件数をキャパシティとしたスライスを `errs` として `joinError` 構造体のインスタンスを生成
3. 引数のエラー一覧の `nil` で無いエラーを `joinError` の `errs` に追加

という流れで、複数のエラーを含んだスライスを持つ `joinError` のインスタンスが生成される。

```go
func Join(errs ...error) error {
	// 1
	n := 0
	for _, err := range errs {
		if err != nil {
			n++
		}
	}
	if n == 0 {
		return nil
	}

	// 2
	e := &joinError{
		errs: make([]error, 0, n),
	}

	// 3
	for _, err := range errs {
		if err != nil {
			e.errs = append(e.errs, err)
		}
	}
	return e
}
```

[src/errors/join.go#L15](https://github.com/golang/go/tree/go1.21.0/src/errors/join.go#L15)

`joinError` は下記のように `errs` プロパティに格納したエラーの各エラーメッセージを改行区切りで結合して `Error` メソッドの戻り値に使用している為、複数のエラー内容をまとめて表示することができている。

```go
func (e *joinError) Error() string {
	var b []byte
	for i, err := range e.errs {
		if i > 0 {
			b = append(b, '\n')
		}
		b = append(b, err.Error()...)
	}
	return string(b)
}
```

[src/errors/join.go#L40](https://github.com/golang/go/tree/go1.21.0/src/errors/join.go#L40)

## wrap.go

wrap.goには下記の3つの関数が定義されている。

- Unwrap
- Is
- As

### Unwrap

`Unwrap` 関数は、前段のerrors.goのコメントアウトに記載があったエラーに定義した `Unwrap` メソッドを実行する処理になる。

```go
type WrapErr struct {
	msg string
	err error
}

func (we *WrapErr) Error() string {
	return we.msg
}

func (we *WrapErr) Unwrap() error {
	return we.err
}

func main() {
	err := errors.New("base error\n")
	wrappedErr := &WrapErr{"wrap error 1\n", err}

	unwrappedErr1 := errors.Unwrap(wrappedErr)
	fmt.Printf("%#v\n", unwrappedErr1)
	// &errors.errorString{s:"base error\n"}

	unwrappedErr2 := errors.Unwrap(unwrappedErr1)
	fmt.Printf("%#v\n", unwrappedErr2)
	// <nil>
}
```

関数の処理はシンプルで、引数に指定されたerrorに対して、 `Unwrap() error` を実装したインターフェースで型アサーションを行い、

- アサーションが失敗（＝対象のエラーが `Unwrap() error` を実装していなかった場合）戻り値に `nil` を指定
- アサーションが成功（＝対象のエラーが `Unwrap() error` を実装していた場合）戻り値に対象のエラーのUnwrapメソッドの結果を指定

という流れになる。

```go
func Unwrap(err error) error {
	u, ok := err.(interface {
		Unwrap() error
	})
	if !ok {
		return nil
	}
	return u.Unwrap()
}

```

[src/errors/wrap.go#L17](https://github.com/golang/go/tree/go1.21.0/src/errors/wrap.go#L17)

> // Unwrap only calls a method of the form "Unwrap() error".
> // In particular Unwrap does not unwrap errors returned by [Join].

コメントアウトにもあるように、型アサーションとして指定しているメソッドは `Unwrap() error` であるため、 `Join` 関数で生成した `joinError` などの `Unwrap() []error` を実装したエラーに対しては、戻り値が `nil` になる。

```go
err1 := errors.New("error1")
err2 := errors.New("error2")
err3 := errors.New("error3")
joinErr := errors.Join(err1, err2, err3)
unwrappedErr3 := errors.Unwrap(joinErr)
fmt.Printf("%#v\n", unwrappedErr3)
// <nil>
```

### Is

`Is` 関数は、2つのエラーを引数に取り、1つ目の引数に指定したエラーとそのエラーがラップしているエラーが2つ目の引数に指定したエラー型に該当するかどうかを確認することができる。

```go
type MyErr string

func (e MyErr) Error() string { return string(e) }

var ERR1 = MyErr("ERR1")
var ERR2 = MyErr("ERR2")

func main() {
	err := fmt.Errorf("wrap error %w", ERR1)
	fmt.Println(errors.Is(err, ERR1))
	// true

	fmt.Println(errors.Is(err, ERR2))
	// false
}
```

処理は下記のかんじで、対象エラーに定義されているUnwrapメソッドを実行していって、最終的な判定は `==` （比較演算子）で行っているため、 `Is` 関数はエラーを値として比較している。

1. reflectliteパッケージを使用して、動的に引数に指定されたエラーが比較可能な値かどうかを確認
    - reflectliteパッケージはinternalで定義されている
2. 引数に指定されたerrに対して、 `Is(error) bool` を実装したインターフェースで型アサーションを行い、アサーションが可能な場合、対象のエラーに実装されている `Is` メソッドを実行する。
3.  errの型でswitch文を実行
    - errが `interface{ Unwrap() error }` に該当する場合は、 Unwrapメソッドの実行結果でerrを上書きして、必要があれば繰り返し処理を続行
    - errが `interface{ Unwrap() []error }` に該当する場合は、 Unwrapメソッドの実行結果のエラーを第一引数に指定して `Is` 関数を再帰実行（= スライスの中に該当のエラーが存在するかを確認）

```go
func Is(err, target error) bool {
	if target == nil {
		return err == target
	}

	// 1
	isComparable := reflectlite.TypeOf(target).Comparable()
	for {
		if isComparable && err == target {
			return true
		}

		// 2
		if x, ok := err.(interface{ Is(error) bool }); ok && x.Is(target) {
			return true
		}

		switch x := err.(type) {
		// 3
		case interface{ Unwrap() error }:
			err = x.Unwrap()
			if err == nil {
				return false
			}

		// 4
		case interface{ Unwrap() []error }:
			for _, err := range x.Unwrap() {
				if Is(err, target) {
					return true
				}
			}
			return false
		default:
			return false
		}
	}
}
```

[src/errors/wrap.go#L44](https://github.com/golang/go/tree/go1.21.0/src/errors/wrap.go#L44)

ポインター型のエラーなど比較することができないエラーは、下記のように `Is` メソッドを定義することで `Is` 関数で比較することができる。

```go
type PointerErr struct {
	msg string
}

func (pe *PointerErr) Error() string {
	return pe.msg
}

func (pe *PointerErr) Is(err error) bool {
	return pe.msg == err.Error()
}

func main() {
	e1 := &PointerErr{"e1"}
	e2 := &PointerErr{"e1"}

	fmt.Println(errors.Is(e1, e2))
}
```

### As

`As` 関数も引数を2つ持つ関数で、 2つ目の引数に指定した型に一致するエラーが1つ目の引数に指定したエラーに該当するかを下記のように確認することができる。

```go
type MyErr struct {
	msg string
}

func (me *MyErr) Error() string {
	return me.msg
}

func main() {
	e1 := &MyErr{"e1"}
	e2 := fmt.Errorf("wrap error %w", e1)

	var me1 *MyErr
	fmt.Println(errors.As(e2, &me1))
	// true

	e3 := errors.New("e3")
	var me2 *MyErr
	fmt.Println(errors.As(e3, &me2))
	// false
}
```

処理の流れとしては下記になり、1～3ではpanicが発生する可能性がある。

1. 2つ目の引数が `nil` の場合panicを発生させる
2. reflectliteを使用して、2つ目の引数がポインター型で無いことや値がnilでないかを確認
3. 2つ目の引数がインターフェース型で無いことやerrorTypeでないかを確認
4. 下記の流れで変数errを更新しながら、targetに該当するかどうかを確認していく
    1. errにtargetTypeを設定することができる場合trueを戻す。
    2. errに対して `interface{ As(any) bool }` で型アサーションを行い、アサーションが成功した場合errに実装されている `As` メソッドを実行する。 `As` メソッドの結果がtrueの場合trueを戻す
    3. `Is` 関数同様にerrに対して `Unwrap()` が実装されているか型アサーションを行い、err変数を更新しながらtargetに該当するかどうかを確認する

```go
func As(err error, target any) bool {
	if err == nil {
		return false
	}

	// 1
	if target == nil {
		panic("errors: target cannot be nil")
	}

	// 2
	val := reflectlite.ValueOf(target)
	typ := val.Type()
	if typ.Kind() != reflectlite.Ptr || val.IsNil() {
		panic("errors: target must be a non-nil pointer")
	}

	// 3
	targetType := typ.Elem()
	if targetType.Kind() != reflectlite.Interface && !targetType.Implements(errorType) {
		panic("errors: *target must be interface or implement error")
	}

	// 4
	for {
		// 4-1
		if reflectlite.TypeOf(err).AssignableTo(targetType) {
			val.Elem().Set(reflectlite.ValueOf(err))
			return true
		}

		// 4-2
		if x, ok := err.(interface{ As(any) bool }); ok && x.As(target) {
			return true
		}

		// 4-3
		switch x := err.(type) {
		case interface{ Unwrap() error }:
			err = x.Unwrap()
			if err == nil {
				return false
			}
		case interface{ Unwrap() []error }:
			for _, err := range x.Unwrap() {
				if As(err, target) {
					return true
				}
			}
			return false
		default:
			return false
		}
	}
}
```

[src/errors/wrap.go#L93](https://github.com/golang/go/tree/go1.21.0/src/errors/wrap.go#L93)
