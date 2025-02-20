import * as language from "../utils/language"
import { toastController, actionSheetController, popoverController, alertController, loadingController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons';
import { Capacitor, Plugins, CameraResultType, CameraSource, CameraDirection } from "@capacitor/core";
import * as workers from "../utils/workers"

const utils = require("../utils/utils")

export async function spawnToast(message, duration = 3000){
    if(Capacitor.isNative){
        if(Math.floor((+new Date()) / 1000) >= window.customVariables.nextNativeToastAllowed){
            window.customVariables.nextNativeToastAllowed = (Math.floor((+new Date()) / 1000) + 2)

            try{
                await Plugins.Toast.show({
                    text: message,
                    duration: "short",
                    position: "bottom"
                })
            }
            catch(e){
                return console.log(e)
            }
        }
        else{
            return false
        }
    }
    else{
        let toast = await toastController.create({
            message,
            duration
        })
    
        return toast.present()
    }
}

export async function spawnMoveToast(callback){
    let toast = await toastController.create({
        message: language.get(this.state.lang, "selectDestination"),
        animated: false,
        buttons: [
            {
                text: language.get(this.state.lang, "cancel"),
                role: "cancel",
                handler: () => {
                    return callback(true)
                }
            },
            {
                text: language.get(this.state.lang, "moveItem"),
                handler: () => {
                    return callback(false, utils.currentParentFolder())
                }
            }
        ]
    })

    return toast.present()
}

export async function spawnRenamePrompt(item, callback){
    let name = item.name

    if(item.type == "file"){
        if(name.indexOf(".") !== -1){
            let nameEx = name.split(".")
    
            nameEx.pop()
    
            name = nameEx.join(".")
        }
    }

    window.$("#main-searchbar").find("input").blur()

    this.setState({
        mainSearchbarDisabled: true
    }, () => {
        this.forceUpdate()
    })

    let alert = await alertController.create({
        header: item.type == "file" ? language.get(this.state.lang, "renameFile") : language.get(this.state.lang, "renameFolder"),
        inputs: [
            {
                type: "text",
                id: "rename-item-input",
                name: "rename-item-input",
                value: name,
                attributes: {
                    autoCapitalize: "off",
                    autoComplete: "off"
                }
            }
        ],
        buttons: [
            {
                text: language.get(this.state.lang, "cancel"),
                role: "cancel",
                handler: () => {
                    return callback(true)
                }
            },
            {
                text: language.get(this.state.lang, "alertOkButton"),
                handler: (inputs) => {
                    return callback(false, inputs['rename-item-input'])
                }
            }
        ]
    })

    await alert.present()

    alert.onWillDismiss(() => {
        this.setState({
            mainSearchbarDisabled: false
        }, () => {
            this.forceUpdate()
        })
    })

    setTimeout(() => {
        try{
            //document.querySelector("ion-alert input").focus()

            window.$("input").each(function(){
                if(window.$(this).attr("id") !== "main-searchbar"){
                    window.$(this).focus()
                }
                else{
                    window.$(this).focus()
                }
            })
        } catch(e){ }
    }, 500)

    return true
}

export async function mainFabAction(){
    let parent = utils.currentParentFolder()
    let folderCreateBtnText = language.get(this.state.lang, "fabCreateFolder")
    let folderCreateNewFolderNameText = language.get(this.state.lang, "newFolderName")
    let folderCreatePlaceholderText = language.get(this.state.lang, "newFolderNamePlaceholder")
    let folderCreateInvalidNameText = language.get(this.state.lang, "invalidFolderName")

    if(parent == "base"){
        folderCreateBtnText = language.get(this.state.lang, "fabCreateDrive")
        folderCreateNewFolderNameText = language.get(this.state.lang, "newDriveName")
        folderCreatePlaceholderText = language.get(this.state.lang, "newDriveNamePlaceholder")
        folderCreateInvalidNameText = language.get(this.state.lang, "invalidDriveName")
    }

    let fabButtons = []

    fabButtons.push({
        text: folderCreateBtnText,
        icon: Ionicons.addCircle,
        handler: async () => {
            let alert = await alertController.create({
                header: folderCreateNewFolderNameText,
                inputs: [
                    {
                        type: "text",
                        id: "new-folder-name-input",
                        name: "new-folder-name-input",
                        placeholder: folderCreatePlaceholderText,
                        attributes: {
                            autoCapitalize: "off",
                            autoComplete: "off"
                        }
                    }
                ],
                buttons: [
                    {
                        text: language.get(this.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(this.state.lang, "alertOkButton"),
                        handler: async (inputs) => {
                            let name = inputs['new-folder-name-input']

                            name = name.replace(/\s*$/, "")

                            if(utils.fileNameValidationRegex(name)){
                                return this.spawnToast(folderCreateInvalidNameText)
                            }

                            if(!name || typeof name !== "string"){
                                return this.spawnToast(folderCreateInvalidNameText)
                            }

                            if(name.length <= 0){
                                return this.spawnToast(folderCreateInvalidNameText)
                            }
                            
                            let folderParent = null
                            let folderUUID = utils.uuidv4()

                            if(parent !== "base"){
                                folderParent = parent
                            }

                            let loading = await loadingController.create({
                                message: ""
                            })

                            loading.present()

                            this.dirExists(name, folderParent, async (err, exists, existsUUID) => {
                                if(err){
                                    console.log(err)

                                    loading.dismiss()
                
                                    return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                                }
                
                                if(exists){
                                    loading.dismiss()
                
                                    return this.spawnToast(language.get(this.state.lang, "folderNameAlreadyExistsCreate", true, ["__NAME__"], [name]))
                                }

                                try{
                                    if(parent == "base"){
                                        var res = await utils.apiRequest("POST", "/v1/dir/create", {
                                            apiKey: this.state.userAPIKey,
                                            uuid: folderUUID,
                                            name: await utils.encryptMetadata(JSON.stringify({
                                                name: name
                                            }), this.state.userMasterKeys[this.state.userMasterKeys.length - 1]),
                                            nameHashed: utils.hashFn(name.toLowerCase())
                                        })
                                    }
                                    else{
                                        var res = await utils.apiRequest("POST", "/v1/dir/sub/create", {
                                            apiKey: this.state.userAPIKey,
                                            uuid: folderUUID,
                                            name: await utils.encryptMetadata(JSON.stringify({
                                                name: name
                                            }), this.state.userMasterKeys[this.state.userMasterKeys.length - 1]),
                                            nameHashed: utils.hashFn(name.toLowerCase()),
                                            parent: folderParent
                                        })
                                    }
                                }
                                catch(e){
                                    console.log(e)

                                    loading.dismiss()
                
                                    return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                                }

                                if(!res.status){
                                    console.log(res.message)

                                    loading.dismiss()

                                    return this.spawnToast(res.message)
                                }

                                if(parent !== "base"){
                                    utils.checkIfItemParentIsBeingShared(folderParent, "folder", {
                                        uuid: folderUUID,
                                        name: name
                                    }, () => {
                                        loading.dismiss()

                                        this.spawnToast(language.get(this.state.lang, "folderCreated", true, ["__NAME__"], [name]))

                                        clearTimeout(window.customVariables.reloadAfterActionTimeout)

                                        window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
                                            this.updateItemList()
                                        }, 500)
                                    })
                                }
                                else{
                                    loading.dismiss()

                                    this.spawnToast(language.get(this.state.lang, "driveCreated", true, ["__NAME__"], [name]))

                                    clearTimeout(window.customVariables.reloadAfterActionTimeout)

                                    window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
                                        this.updateItemList()
                                    }, 500)
                                }
                            })
                        }
                    }
                ]
            })
        
            await alert.present()

            setTimeout(() => {
                try{
                    document.querySelector("ion-alert input").focus()
                } catch(e){ }
            }, 500)

            return true
        }
    })

    fabButtons.push({
        text: language.get(this.state.lang, "fabCreateTextFile"),
        icon: Ionicons.createOutline,
        handler: async () => {
            let alert = await alertController.create({
                header: language.get(this.state.lang, "fabCreateTextFile"),
                inputs: [
                    {
                        type: "text",
                        id: "new-text-file-name-input",
                        name: "new-text-file-name-input",
                        value: ".txt",
                        placeholder: language.get(this.state.lang, "fabCreateTextFilePlaceholder"),
                        attributes: {
                            autoCapitalize: "off",
                            autoComplete: "off"
                        }
                    }
                ],
                buttons: [
                    {
                        text: language.get(this.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(this.state.lang, "fabCreateBtn"),
                        handler: async (inputs) => {
                            let name = inputs['new-text-file-name-input']

                            name = name.replace(/\s*$/, "")

                            if(utils.fileNameValidationRegex(name)){
                                return this.spawnToast(language.get(this.state.lang, "fabCreateTextFileInvalidName"))
                            }

                            if(!name || typeof name !== "string"){
                                return this.spawnToast(language.get(this.state.lang, "fabCreateTextFileInvalidName"))
                            }

                            if(name.length <= 0){
                                return this.spawnToast(language.get(this.state.lang, "fabCreateTextFileInvalidName"))
                            }

                            let ext = name.split(".")
                            ext = ext[ext.length - 1]

                            let fileType = utils.getFilePreviewType(ext)

                            if(!["code", "text"].includes(fileType)){
                                return this.spawnToast(language.get(this.state.lang, "fabCreateTextFileInvalidName"))
                            }

                            let uploadParent = ""

                            if(utils.currentParentFolder() == "base"){
                                let defaultFolderUUID = undefined
                
                                for(let i = 0; i < this.state.itemList.length; i++){
                                    if(this.state.itemList[i].isDefault){
                                        defaultFolderUUID = this.state.itemList[i].uuid
                                    }
                                }
                
                                if(typeof defaultFolderUUID !== "undefined"){
                                    this.routeTo("/base/" + defaultFolderUUID)
                                }

                                uploadParent = defaultFolderUUID
                            }
                            else{
                                uploadParent = utils.currentParentFolder()
                            }
                            
                            let item = {
                                name: name,
                                parent: uploadParent
                            }

                            return window.customFunctions.openTextEditor(item, "")
                        }
                    }
                ]
            })
        
            await alert.present()

            setTimeout(() => {
                try{
                    utils.moveCursorToStart("ion-alert input", true)

                    document.querySelector("ion-alert input").focus()
                } catch(e){ }
            }, 500)

            return true
        }
    })

    fabButtons.push({
        text: language.get(this.state.lang, "fabTakeImage"),
        icon: Ionicons.camera,
        handler: async () => {
            if(!Capacitor.isNative){
                return false
            }

            if(Capacitor.isNative){
                if(this.state.settings.onlyWifi){
                    let networkStatus = await Plugins.Network.getStatus()
        
                    if(networkStatus.connectionType !== "wifi"){
                        return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
                    }
                }
            }

            if(utils.currentParentFolder() == "base"){
                let defaultFolderUUID = undefined

                for(let i = 0; i < this.state.itemList.length; i++){
                    if(this.state.itemList[i].isDefault){
                        defaultFolderUUID = this.state.itemList[i].uuid
                    }
                }

                if(typeof defaultFolderUUID !== "undefined"){
                    this.routeTo("/base/" + defaultFolderUUID)
                }
            }

            try{
                var image = await Plugins.Camera.getPhoto({
                    quality: 100,
                    allowEditing: false,
                    resultType: CameraResultType.Base64,
                    saveToGallery: false,
                    source: CameraSource.Camera,
                    direction: CameraDirection.Rear,
                    presentationStyle: "fullscreen"
                })
            }
            catch(e){
                console.log(e)

                return false
            }

            workers.convertBase64ToArrayBuffer(image.base64String, (arrayBuffer) => {
                let name = language.get(this.state.lang, "photo") + "_" + new Date().toDateString().split(" ").join("_") + "_" + utils.unixTimestamp() + ".jpeg"

                try{
                    var blob = new File([arrayBuffer], name, {
                        type: "image/jpeg",
                        size: arrayBuffer.byteLength,
                        lastModified: new Date()
                    })
                }
                catch(e){
                    return console.log(e)
                }

                return this.queueFileUpload(blob)
            })
        }
    })

    fabButtons.push({
        text: language.get(this.state.lang, "fabUploadFiles"),
        icon: Ionicons.cloudUpload,
        handler: async () => {
            if(Capacitor.isNative){
                if(this.state.settings.onlyWifi){
                    let networkStatus = await Plugins.Network.getStatus()
        
                    if(networkStatus.connectionType !== "wifi"){
                        return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
                    }
                }
            }
            
            if(utils.currentParentFolder() == "base"){
                let defaultFolderUUID = undefined

                for(let i = 0; i < this.state.itemList.length; i++){
                    if(this.state.itemList[i].isDefault){
                        defaultFolderUUID = this.state.itemList[i].uuid
                    }
                }

                if(typeof defaultFolderUUID !== "undefined"){
                    this.routeTo("/base/" + defaultFolderUUID)
                }
            }

            return document.getElementById("file-input-dummy").click()
        }
    })

    fabButtons.push({
        text: language.get(this.state.lang, "cancel"),
        icon: Ionicons.close,
        handler: () => {
            return actionSheet.dismiss()
        }
    })

    let actionSheet = await actionSheetController.create({
        buttons: fabButtons
    })

    return actionSheet.present()
}

export async function mainMenuPopover(event){
    event.persist()

    let customElementId = utils.generateRandomClassName()

    window.customElements.define(customElementId, class ModalContent extends HTMLElement {
        connectedCallback(){
            this.innerHTML = `
                <ion-list>
                    ` + (window.location.href.indexOf("recent") !== -1 ? `` : `<ion-item lines="none" detail="false" button onClick="window.customFunctions.openOrderBy()">` + language.get(window.customVariables.lang, "orderBy") + `</ion-item>`) + `
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(window.customVariables.lang, "selectAll") + `</ion-item>
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.refreshItemList()">` + language.get(window.customVariables.lang, "refresh") + `</ion-item>
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.toggleGridMode()">` + language.get(window.customVariables.lang, "toggleGridMode") + `</ion-item>
                    <!--<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(window.customVariables.lang, "close") + `</ion-item>-->
                </ion-list>
            `
        }
    })

    let popover = await popoverController.create({
        component: customElementId,
        event: event
    })

    return popover.present()
}