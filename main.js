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


// Select a file, get its path and display a preview
async function selectImage() {
    try {

        core.executeAsModal(
            async () => {
                // Open a file given entry
                // Show single file selection dialog
                const file = await localFileSystem.getFileForOpening({
                    types: ["png", "jpg", "jpeg"], // 許可される画像形式
                    allowMultiple: false, // 単一ファイル
                });

                // If no file is selected
                if (!file) {
                    console.log("No file selected");
                    return;
                }
                // copy to temp folder
                const tempFolder = await localFileSystem.getTemporaryFolder();
                await file.copyTo(tempFolder, {overwrite: true});

                //rename file in Temp folder
                const fileName = file.name;
                const myTempFile = await tempFolder.getEntry( fileName );
                console.log("Selected file name:", myTempFile.name);

                // reason using moveto is that rename is not support? rename dont work
                await myTempFile.moveTo(tempFolder, {newName: myFileName, overwrite: true})


                const tmpFile = await tempFolder.getEntry( myFileName );
                console.log("tmpFile path:", tmpFile.nativePath);
                //photoshop open
                //const mydocument = await app.open(tmpFile);
                const imgcontainer = document.getElementById("imgcontainer");

                imgcontainer.src = `file://${tmpFile.nativePath}`;
            }
        );

    } catch (err) {
        console.error("Could not open file:", err);
    }
}

// Define default settings for PI requests as global variables
const defaultFaceSwapSettings = {
    source_faces_index: [0],
    face_index: [0],
    upscaler: "",
    scale: 1,
    upscale_visibility: 1,
    face_restorer: "CodeFormer",
    restorer_visibility: 1,
    restore_first: 1,
    model: "inswapper_128.onnx", // model
    gender_source: 0,
    gender_target: 0,
    save_to_file: 0,
    result_file_path: "",
    device: "CUDA",
    mask_face: 1,
    select_source: 0,
    face_model: "",  // deafult: ""
    source_folder: "",
    random_image: 0,
    upscale_force: 0
};

// Variables that hold the current settings
let currentFaceSwapSettings = {...defaultFaceSwapSettings};

// A function that generates request data
function createRequestData(sourceBase64, targetBase64) {
    return {
        source_image: "data:image/png;base64," + sourceBase64,
        target_image: "data:image/png;base64," + targetBase64,
        ...currentFaceSwapSettings
    };
}

// Functions that update settings
function updateFaceSwapSettings(newSettings) {
    currentFaceSwapSettings = {...currentFaceSwapSettings, ...newSettings};
    console.log("Your settings have been updated:", currentFaceSwapSettings);
}

// Fixing the faceSwap function
async function faceSwap() {
    try {
        core.executeAsModal(
            async () => {
                console.log("Face Swap process started");
                // 既存のコード（変更なし）...
                const imaging = require("photoshop").imaging;
                const tempFolder = await localFileSystem.getTemporaryFolder();
                const tmpFile = await tempFolder.getEntry(myFileName);
                if (!tmpFile) {
                    console.log("No source image file selected");
                    return;
                }

                // Open a temporary file to get image data
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

                // Get the current document (target image)
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

                // Ensure source and target are not the same
                if (sourceBase64 === targetBase64) {
                    console.error("Error: Source and target images are identical");
                    return;
                }

                // Here we use a function to generate the request data.
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
                        console.log("Face Swap process completed");
                    } else {
                        console.error("No image data in response from API");
                    }
                } catch (error) {
                    console.error("API call error:", error);
                }
            },
            {
                commandName: "Face Swap - Data Acquisition",
                timeOut: 30000
            }
        );
    } catch (err) {
        console.error("Face Swap error:", err);
    }
}

// Modification of loadFaceModels function - Added processing when selecting a model
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
        console.log("Acquired facemodels data:", data);

        // faceModels要素を取得
        const faceModelsContainer = document.getElementById('faceModels');

        if (!faceModelsContainer) {
            console.error("faceModels no  found");
            return;
        }

        // 既存のドロップダウンがあれば削除
        const existingDropdown = faceModelsContainer.querySelector('sp-dropdown');
        if (existingDropdown) {
            faceModelsContainer.removeChild(existingDropdown);
        }

        // UXP用のドロップダウンを作成
        const dropdownHTML = `
            <sp-picker id="model_select" placeholder="FaceModel if use">
                <sp-menu slot="options">
                    <sp-menu-item value="none">none</sp-menu-item>
                    ${data && data.facemodels && Array.isArray(data.facemodels) ? 
                        data.facemodels.map(model => `<sp-menu-item value="${model}">${model}</sp-menu-item>`).join('') : ''}
                </sp-menu>
            </sp-picker>
        `;

        // HTMLをDOMに追加
        faceModelsContainer.innerHTML = dropdownHTML;

        // Add dropdown selection change event listener
        const dropdown = document.getElementById('model_select');
        if (dropdown) {
            dropdown.addEventListener('change', (event) => {
                const selectedModel = event.target.value;
                console.log('selected model:', selectedModel);

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

        console.log("faceModels loaded");
    } catch (error) {
        console.error("error faceModels loading", error);
    }
}

//Add an event listener to run the loadFaceModels function on initial load.
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: faceModels loading");
    loadFaceModels();
});

// A helper function to convert a Base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

//sample fuinc. not usesd
function openUrl(url) {
    const shell = require('uxp').shell;
    shell.openExternal(url);
}

// click event listener
document
    .getElementById("selectImageButton")
    .addEventListener("click", selectImage);
document
    .getElementById("faceSwap")
    .addEventListener("click", faceSwap);