# Photoshop FaceSwap UXP プラグイン

## 概要

このプラグインは、Adobe Photoshop内で顔交換（Face Swap）機能を提供します。カレントレイヤーの顔画像と、プラグインで選択した画像の顔をスワップすることを目指しています。  
現在は、選択したファイルをプラグインパネルに表示できる段階

## 機能

- 単一画像ファイルの選択
- 選択した画像のプレビュー表示
- カレントレイヤーと選択画像間での顔交換処理
- 処理結果を新規レイヤーとして配置

## 動作要件

- Adobe Photoshop 2021以降
- UXP対応環境
- ローカルで動作するFace Swap API（`http://127.0.0.1:7860`）

## インストール方法

1. このリポジトリをクローンまたはダウンロードします
```bash
git clone https://github.com/yourusername/photoshop-faceswap-uxp.git
```

1. Adobe UXP Developer Toolを起動し、プラグインをロードします
2. Photoshopでプラグインを有効化します

## 使用方法
1. Photoshopでプラグインを開きます
2. 「画像選択」ボタンをクリックし、ソース画像を選択します
3. 選択した画像がプレビューエリアに表示されます
4. Photoshopで顔交換したい画像とレイヤーを開きます
5. 「FaceSwap」ボタンをクリックして処理を実行します
6. 処理結果が新規レイヤーとして挿入されます

## APIの仕様
プラグインは以下のようなAPIリクエストを行います：

curl -X POST \
'http://127.0.0.1:7860/reactor/image' \
-H 'accept: application/json' \
-H 'Content-Type: application/json' \
-d '{
"source_image": "base64エンコードされた画像...",
"target_image": "base64エンコードされた画像...",
"source_faces_index": [0],
"face_index": [0],
"upscaler": "",
"scale": 1,
"upscale_visibility": 1,
"face_restorer": "CodeFormer",
"restorer_visibility": 1,
"restore_first": 1,
"model": "inswapper_128.onnx",
"gender_source": 0,
"gender_target": 0,
"save_to_file": 0,
"result_file_path": "",
"device": "CUDA",
"mask_face": 1,
"select_source": 0,
"face_model": "",
"source_folder": "",
"random_image": 0,
"upscale_force": 0
}'
## 開発環境
- Node.js
- Adobe UXP
- Adobe Photoshop API

## ライセンス
MIT
## 謝辞
このプラグインは、Adobe UXP SDKとPhotoshop APIを利用して開発されています。
※注意事項: このプラグインを使用する際は、肖像権やプライバシーに十分配慮してください。また、APIサーバーはローカル環境で動作することを前提としています。

