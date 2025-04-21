# Photoshop FaceSwap UXP プラグイン
# Photoshop FaceSwap UXP Plugin

## 概要
このプラグインは、Adobe Photoshop内で顔交換（Face Swap）機能を提供します。カレントレイヤーの顔画像と、プラグインで選択した画像の顔をスワップすることを目指しています。
## Overview
This plugin provides a Face Swap function within Adobe Photoshop. It aims to swap the face in the current layer with the face in an image selected through the plugin.

## 現在の段階
- 選択したファイルをプラグインパネルに表示できる段階
- facemodel を選択可能に
## Current Stage
- Able to display selected files in the plugin panel.
- Able to select a facemodel.

## 問題点
- RGB8のみ変換
- カラープロファイル無しは 変換できない
- 開いたファイルの最下位レイヤーのみ変換
## Issues
- Only supports RGB8 format.
- Cannot process images without a color profile.
- Only processes the bottommost layer of the opened file.

## 機能
- 単一画像ファイルの選択
- 選択した画像のプレビュー表示
- カレントレイヤーと選択画像間での顔交換処理
- 処理結果を新規レイヤーとして配置
## Features
- Single image file selection.
- Preview display of the selected image.
- Face swap processing between the current layer and the selected image.
- Places the processing result as a new layer.

## 動作要件
- Adobe Photoshop 2021以降
- UXP対応環境
- ローカルで動作するFace Swap API（`http://127.0.0.1:7860`）
## System Requirements
- Adobe Photoshop 2021 or later.
- UXP compatible environment.
- Locally running Face Swap API (`http://127.0.0.1:7860`).

## インストール方法
1. このリポジトリをクローンまたはダウンロードします
2. Adobe UXP Developer Toolを起動し、プラグインをロードします
3. Photoshopでプラグインを有効化します
## Installation
1. Clone or download this repository.
2. Launch Adobe UXP Developer Tool and load the plugin.
3. Enable the plugin in Photoshop.

## 使用方法
1. Photoshopでプラグインを開きます
2. 「画像選択」ボタンをクリックし、ソース画像を選択します
3. 選択した画像がプレビューエリアに表示されます
4. Photoshopで顔交換したい画像とレイヤーを開きます
5. 「FaceSwap」ボタンをクリックして処理を実行します
6. 処理結果が新規レイヤーとして挿入されます
## Usage
1. Open the plugin in Photoshop.
2. Click the "画像選択" (Select Image) button and choose a source image.
3. The selected image will be displayed in the preview area.
4. Open the image and layer you want to perform the face swap on in Photoshop.
5. Click the "FaceSwap" button to execute the process.
6. The processing result will be inserted as a new layer.

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
## Development Environment
- Node.js
- Adobe UXP
- Adobe Photoshop API

## ライセンス
MIT
## License
MIT

## 謝辞
このプラグインは、Adobe UXP SDKとPhotoshop APIを利用して開発されています。
※注意事項: このプラグインを使用する際は、肖像権やプライバシーに十分配慮してください。また、APIサーバーはローカル環境で動作することを前提としています。
## Acknowledgements
This plugin is developed using the Adobe UXP SDK and Photoshop API.
\* Note: Please be mindful of portrait rights and privacy when using this plugin. Also, the API server is assumed to be running in a local environment.