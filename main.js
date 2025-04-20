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
    -H 'Content-Type: application/json' \
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
                const {localFileSystem} = require("uxp").storage;

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
                const myFileName = "myFile.png";
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

//url 文字列を受け取り、ブラウザOPENする関数
function openUrl(url) {
    const shell = require('uxp').shell;
    shell.openExternal(url);
}

// ボタンクリックイベントを処理
document
    .getElementById("selectImageButton")
    .addEventListener("click", selectImage);

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
