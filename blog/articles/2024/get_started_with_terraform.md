---
title: "初めてTerraformを触ってみて調べたことまとめ"
created_at: "2024/02/25"
updated_at: "2024/02/25"
tags: [terraform]
publish: false
---

業務で初めてTerraformを使う際に調べた各ファイルの用途や疑問に思った内容をまとめる。

## Terraformのコマンド

### terraform init

XXX

### terraform plan

XXX

### terraform apply

XXX

## 基本的なファイルの役割

XXX

### main.tf

XXX

### variables.tf

XXX

### outputs.tf

XXX

### ～.tfstate

XXX

### ～.tfvars

XXX

### .terraformディレクトリ

XXX

### どのファイルをGit管理下から除外すべきなのか

Terraformを使用する環境を作成する時に、この部分が一番最初に分からなかった。

前段で記載した内容をまとめると、GitHubなどでterraformのファイルを管理する場合は、下記のファイル・ディレクトリは管理外にするのば良さそう。

- XXX
- XXX
- XXX

## 基本的なデータ要素の役割

XXX

### resources

XXX

### provider

XXX

### locals

XXX

### variables

XXX

### localsとvariablesの使い分け

XXX

### data sources

XXX

### backend

XXX

### modules

XXX

### workspace

XXX

### 環境毎の切り分け方法

自分が調べた中だと、下記の2つが選択肢として存在していた。

- 各環境用の `.tfvars` ファイルと `.tfstate` ファイルを用意して、 `terraform plan` や `terraform apply` を実行する際の引数に `-var-file` と `-state` を指定する。

```bash
terraform plan -var-file="dev.tfvars" -state="dev.tfstate"
terraform plan -var-file="stage.tfvars" -state="stage.tfstate"
terraform plan -var-file="prod.tfvars" -state="prod.tfstate"
```

```bash
terraform apply -var-file="dev.tfvars" -state="dev.tfstate"
terraform apply -var-file="stage.tfvars" -state="stage.tfstate"
terraform apply -var-file="prod.tfvars" -state="prod.tfstate"
```

```Terraform
provider "aws" {
  region = "us-west-2"
}

resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}
```

## まとめ

- XXX
- XXX
- XXX

## 参照

- []()
