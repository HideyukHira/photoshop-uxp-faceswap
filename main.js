/*
adobe photoshop uxp プラグイン開発
## 目的
-photoshop 内で開いているファイルの、カレントレイヤーの顔画像をプラグインで洗濯した1枚の画像の顔とFace swapする機能
## 仕様
- プラグインの画像選択 #selectImageButton をクリックすると、単一ファイル選択ダイアログ, ファイルを選択
- 選択されたファイルが #slectedView に表示される、サイズはDOMのサイズに合わせる、画像の原寸は無視
- Faceswap 処理
    - #faceSwap ボタンをクリックするとローカルアドレスのAPIへデータをPOSTする
    - 選択された画像と、カレントレイヤーの画像を base64 化する
    - 選択された画像を source_image、カレントレイヤーの画像を target_image として、APIへPOSTで送信する
    - APIから返却された base64形式の データを、受け取る
    - base64 からビットマップなどの画像形式に変換し、開いているファイルの最上部のレイヤーへ配置する

## APIの仕様
curl -X POST \
	'http://127.0.0.1:7860/reactor/image' \
    -H 'accept: application/json' \
    -H 'Content-Type': 'application/json' \
    -d '{
    "source_image": "data:image/png;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABQAAD/7g...",
    "target_image": "data:image/png;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABCAAD/7g...",
    "source_faces_index": [0],
    "face_index": [0],
    "upscaler": "",
    "scale": ,
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


 */

const {entrypoints, shell} = require("uxp");
const {app, core} = require("photoshop");
const {localFileSystem} = require("uxp").storage;

const myFileName = "myFile.png";
showAlert = () => {
    alert("This is an alert message");
}

entrypoints.setup({
    commands: {
        showAlert,
    },
    panels: {
        vanilla: {
            show(node) {
            }
        }
    }
});


// ファイル選択してそのパスを取得しプレビュー表示
async function selectImage() {
    try {

        core.executeAsModal(
            async () => {
                // Open a file given entry
                // 単一ファイル選択ダイアログを表示
                const file = await localFileSystem.getFileForOpening({
                    types: ["png", "jpg", "jpeg"], // 許可される画像形式
                    allowMultiple: false, // 単一ファイル
                });

                // ファイルが選択されなかった場合
                if (!file) {
                    console.log("ファイルが選択されませんでした");
                    return;
                }
                // copy to temp folder
                const tempFolder = await localFileSystem.getTemporaryFolder();
                await file.copyTo(tempFolder, {overwrite: true});

                //rename file in Temp folder
                const fileName = file.name;
                const myTempFile = await tempFolder.getEntry( fileName );
                console.log("選択されたファイル名:", myTempFile.name);

                // reason using moveto is that rename is not support? rename dont work
                await myTempFile.moveTo(tempFolder, {newName: myFileName, overwrite: true})


                const tmpFile = await tempFolder.getEntry( myFileName );
                console.log("tmpFile path:", tmpFile.nativePath);
                //photoshop で開く
                //const mydocument = await app.open(tmpFile);
                const imgcontainer = document.getElementById("imgcontainer");

                imgcontainer.src = `file://${tmpFile.nativePath}`;
            }
        );

    } catch (err) {
        console.error("ファイルを開けませんでした:", err);
    }
}

// APIリクエスト用のデフォルト設定をグローバル変数として定義
const defaultFaceSwapSettings = {
    source_faces_index: [0],
    face_index: [0],
    upscaler: "",
    scale: 1,
    upscale_visibility: 1,
    face_restorer: "CodeFormer",
    restorer_visibility: 1,
    restore_first: 1,
    model: "inswapper_128.onnx", // デフォルトモデル
    gender_source: 0,
    gender_target: 0,
    save_to_file: 0,
    result_file_path: "",
    device: "CUDA",
    mask_face: 1,
    select_source: 0,
    face_model: "",  // フェイスモデルはデフォルトでは空
    source_folder: "",
    random_image: 0,
    upscale_force: 0
};

// 現在の設定を保持する変数
let currentFaceSwapSettings = {...defaultFaceSwapSettings};

// リクエストデータを生成する関数
function createRequestData(sourceBase64, targetBase64) {
    return {
        source_image: "data:image/png;base64," + sourceBase64,
        target_image: "data:image/png;base64," + targetBase64,
        ...currentFaceSwapSettings
    };
}

// 設定を更新する関数
function updateFaceSwapSettings(newSettings) {
    currentFaceSwapSettings = {...currentFaceSwapSettings, ...newSettings};
    console.log("設定が更新されました:", currentFaceSwapSettings);
}

// faceSwap関数の修正
async function faceSwap() {
    try {
        core.executeAsModal(
            async () => {
                // 既存のコード（変更なし）...
                const imaging = require("photoshop").imaging;
                const tempFolder = await localFileSystem.getTemporaryFolder();
                const tmpFile = await tempFolder.getEntry(myFileName);
                if (!tmpFile) {
                    console.log("ソース画像ファイルが選択されていません");
                    return;
                }

                // 一時的にファイルを開いて画像データを取得
                const sourceDocument = await app.open(tmpFile);
                const sourceImageObj = await imaging.getPixels({
                    documentID: sourceDocument._id,
                    layerID: sourceDocument.activeLayers[0]._id
                });

                const sourceBase64 = await imaging.encodeImageData({
                    imageData: sourceImageObj.imageData,
                    base64: true,
                });
                sourceDocument.close();

                // 現在のドキュメント（ターゲット画像）の取得
                const tartgetDocment = app.activeDocument;
                const targetLayers = tartgetDocment.layers;
                const targetLayer = targetLayers[targetLayers.length - 1];
                const targetImageObj = await imaging.getPixels({
                    documentID: tartgetDocment._id,
                    layerID: tartgetDocment.activeLayers[0]._id,
                });

                const targetBase64 = await imaging.encodeImageData({
                    imageData: targetImageObj.imageData,
                    base64: true,
                });

                // ソースとターゲットが同じでないことを確認
                if (sourceBase64 === targetBase64) {
                    console.error("エラー: ソース画像とターゲット画像が同一です");
                    return;
                }

                // ここで関数を使ってリクエストデータを生成
                const requestData = createRequestData(sourceBase64, targetBase64);

                // API呼び出し
                try {
                    const response = await fetch('http://localhost:7860/reactor/image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });

                    // 以下は既存のコード（変更なし）...
                    if (!response.ok) {
                        throw new Error(`APIエラー: ${response.status}`);
                    }

                    const result = await response.json();

                    if (result && result.image) {
                        const base64Data = result.image.replace(/^data:image\/\w+;base64,/, "");
                        const resultFile = await tempFolder.createFile("result.png", { overwrite: true });
                        await resultFile.write(base64ToArrayBuffer(base64Data));
                        const myresultFile = await tempFolder.getEntry("result.png");
                        const tempDocument = await app.open(myresultFile);
                        const placedLayer = tempDocument.layers[0];
                        await placedLayer.duplicate(tartgetDocment);
                        await tempDocument.closeWithoutSaving();
                        const newLayer = tartgetDocment.activeLayers[0];
                        await newLayer.moveAbove(tartgetDocment.layers[0]);
                        newLayer.name = "Face Swap Result";
                        console.log("Face Swap処理が完了しました");
                    } else {
                        console.error("APIからの応答に画像データがありません");
                    }
                } catch (error) {
                    console.error("API呼び出しエラー:", error);
                }
            },
            {
                commandName: "Face Swap - データ取得",
                timeOut: 30000
            }
        );
    } catch (err) {
        console.error("Face Swap処理エラー:", err);
    }
}

// loadFaceModels関数の修正 - モデル選択時の処理を追加
async function loadFaceModels(){
    try {
        // APIにリクエストを送信
        const response = await fetch('http://localhost:7860/reactor/facemodels', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`APIエラー: ${response.status}`);
        }

        const data = await response.json();

        // 取得したデータを確認
        console.log("取得したfacemodelsデータ:", data);

        // faceModels要素を取得
        const faceModelsContainer = document.getElementById('faceModels');

        if (!faceModelsContainer) {
            console.error("faceModels要素が見つかりません");
            return;
        }

        // 既存のドロップダウンがあれば削除
        const existingDropdown = faceModelsContainer.querySelector('sp-dropdown');
        if (existingDropdown) {
            faceModelsContainer.removeChild(existingDropdown);
        }

        // UXP用のドロップダウンを作成
        const dropdownHTML = `
            <sp-dropdown id="model_select" placeholder="FaceModel if use">
                <sp-menu slot="options">
                    <sp-menu-item value="none">none</sp-menu-item>
                    ${data && data.facemodels && Array.isArray(data.facemodels) ? 
                        data.facemodels.map(model => `<sp-menu-item value="${model}">${model}</sp-menu-item>`).join('') : ''}
                </sp-menu>
            </sp-dropdown>
        `;

        // HTMLをDOMに追加
        faceModelsContainer.innerHTML = dropdownHTML;

        // ドロップダウンの選択変更イベントリスナーを追加
        const dropdown = document.getElementById('model_select');
        if (dropdown) {
            dropdown.addEventListener('change', (event) => {
                const selectedModel = event.target.value;
                console.log('選択されたモデル:', selectedModel);

                // モデル選択に基づいて設定を更新
                if (selectedModel && selectedModel !== 'none') {
                    // フェイスモデルを設定
                    // none以外が選択された場合、select_source: 1 に設定
                    updateFaceSwapSettings({
                        face_model: selectedModel + ".safetensors",
                        select_source: 1  // face_model使用時は1に設定
                    });
                } else {
                    // 'none'が選択された場合はデフォルト設定に戻す
                    // face_modelを空に、select_source: 0 に設定
                    updateFaceSwapSettings({
                        face_model: "",
                        select_source: 0  // face_model未使用時は0に設定
                    });
                }
            });
        }

        console.log("faceModelsのロードが完了しました");
    } catch (error) {
        console.error("faceModelsのロード中にエラーが発生しました:", error);
    }
}

// 初期ロード時にloadFaceModels関数を実行するイベントリスナーを追加
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoadedイベント: faceModelsをロードします");
    loadFaceModels();
});

// Base64文字列をArrayBufferに変換するヘルパー関数
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

//url 文字列を受け取り、ブラウザOPENする関数
function openUrl(url) {
    const shell = require('uxp').shell;
    shell.openExternal(url);
}

// ボタンクリックイベントを処理
document
    .getElementById("selectImageButton")
    .addEventListener("click", selectImage);
document
    .getElementById("faceSwap")
    .addEventListener("click", faceSwap);


/*
photoshop 内でドキュメントなどの状態変更を行う場合は
ExecuteAsModal 中で行う
https://developer.adobe.com/photoshop/uxp/2022/ps_reference/

async function makeDefaultDocument(executionContext) {
  const app = require('photoshop').app;
  let myDoc = await app.createDocument({preset: "My Web Preset 1"});
}

await require('photoshop').core.executeAsModal(makeDefaultDocument);

 */