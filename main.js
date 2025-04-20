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


// TODO #selectImage をクリックすると、単一ファイル選択ダイアログ, ファイルを選択
// TODO 選択されたファイルが #slectedView に表示される、サイズはDOMのサイズに合わせる、画像の原寸は無視
// ファイル選択用の関数

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

        //openUrl( "https://www.adobe.com/")


    } catch (err) {
        console.error("ファイルを開けませんでした:", err);
    }
}

async function faceSwap() {
    try {
        core.executeAsModal(
            async () => {
                // 4. imaging モジュールを取得
                const imaging = require("photoshop").imaging;

                // 1. ソース画像（選択した画像）の取得
                const tempFolder = await localFileSystem.getTemporaryFolder();
                const tmpFile = await tempFolder.getEntry(myFileName);
                if (!tmpFile) {
                    console.log("ソース画像ファイルが選択されていません");
                    return;
                }


                // 5. ソース画像をBase64に変換
                // 一時的にファイルを開いて画像データを取得
                const sourceDocument = await app.open(tmpFile);
                const sourceImageObj = await imaging.getPixels({
                    documentID: sourceDocument._id,
                    layerID: sourceDocument.activeLayers[0]._id
                });

                console.log("sourceDocument:",sourceDocument);
                console.log("sourceImageObj:",sourceImageObj);


                // Base64エンコード
                const sourceBase64 = await imaging.encodeImageData({
                    imageData: sourceImageObj.imageData,
                    base64: true,
                });
                // console.log("sourceBase64:",sourceBase64);
                sourceDocument.close();



                // 2. 現在のドキュメント（ターゲット画像）の取得
                const tartgetDocment = app.activeDocument;
                if (!tartgetDocment) {
                    console.log("開いているドキュメントがありません");
                    return;
                }



                // 3. 現在のレイヤーを取得
                const activeLayer = tartgetDocment.activeLayers[0];
                if (!activeLayer) {
                    console.log("アクティブなレイヤーがありません");
                    return;
                }


                // 6. ターゲット画像（現在のレイヤー）をBase64に変換
                const targetImageObj = await imaging.getPixels({
                    documentID: tartgetDocment._id,
                    layerID: tartgetDocment.activeLayers[0]._id
                });

                console.log("targetDocument:",tartgetDocment);
                console.log("targetImageObj:",targetImageObj);

                // Base64エンコード
                const targetBase64 = await imaging.encodeImageData({
                    imageData: targetImageObj.imageData,
                    base64: true,
                });

                console.log("targetBase64:",targetBase64);


                console.log("ソース画像Base64取得完了");
                console.log("ターゲット画像Base64取得完了");

                // 確認のためにログ出力
                console.log("ソースBase64の先頭部分:", sourceBase64.substring(0, 50));
                console.log("ターゲットBase64の先頭部分:", targetBase64.substring(0, 50));

                // ソースとターゲットが同じでないことを確認
                if (sourceBase64 === targetBase64) {
                    console.error("エラー: ソース画像とターゲット画像が同一です");
                    return;
                }


                // 7. APIリクエストの作成
                const requestData = {
                    source_image: "data:image/png;base64," + sourceBase64,
                    target_image: "data:image/png;base64," + targetBase64,
                    source_faces_index: [0],
                    face_index: [0],
                    upscaler: "",
                    scale: 1,
                    upscale_visibility: 1,
                    face_restorer: "CodeFormer",
                    restorer_visibility: 1,
                    restore_first: 1,
                    model: "inswapper_128.onnx",
                    gender_source: 0,
                    gender_target: 0,
                    save_to_file: 0,
                    result_file_path: "",
                    device: "CUDA",
                    mask_face: 1,
                    select_source: 0,
                    face_model: "",
                    source_folder: "",
                    random_image: 0,
                    upscale_force: 0
                };

                // 8. API呼び出し（fetchの実装）
                try {
                    const response = await fetch('http://localhost:7860/reactor/image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });

                    if (!response.ok) {
                        throw new Error(`APIエラー: ${response.status}`);
                    }

                    const result = await response.json();

                    // 9. 返却されたBase64データを処理
                    if (result && result.image) {
                        // Base64データからプレフィックスを削除
                        const base64Data = result.image.replace(/^data:image\/\w+;base64,/, "");

                    // 修正版：ファイルからレイヤーを作成する部分
                    // 一時ファイルからビットマップを作成し、それを新規レイヤーとして配置

                    // Base64をデコードして一時ファイルに保存
                    const resultFile = await tempFolder.createFile("result.png", { overwrite: true });
                    await resultFile.write(base64ToArrayBuffer(base64Data));

                    // 代替アプローチ：ファイルからドキュメントを作成し、それをレイヤーとしてインポート



                            // アクティブドキュメントを取得
                            const currentDocument = app.activeDocument;
                            const myresultFile = await tempFolder.getEntry("result.png");
                            const tempDocument = await app.open(myresultFile);

                            const placedLayer = tempDocument.layers[0];
                            await placedLayer.duplicate(currentDocument);

                            await tempDocument.closeWithoutSaving();

                            const newLayer = currentDocument.activeLayers[0];
                            await newLayer.moveAbove(currentDocument.layers[0]);




                        console.log("Face Swap処理が完了しました");
                    } else {
                        console.error("APIからの応答に画像データがありません");
                    }
                } catch (error) {
                    console.error("API呼び出しエラー:", error);
                }

                // ソースドキュメントを閉じる
                await sourceDocument.close();
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