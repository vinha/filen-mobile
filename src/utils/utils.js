import { Capacitor, Plugins } from "@capacitor/core";

const CryptoJS = require("crypto-js")
const striptags = require("striptags")

const md2 = require("js-md2")
const md4 = require("js-md4")
const md5 = require("js-md5")
const sha256 = require("js-sha256")
const sha1 = require("js-sha1")
const sha512 = require("js-sha512")
const sha384 = require("js-sha512").sha384

export function hashPassword(password){
	return sha512(sha384(sha256(sha1(password)))) + sha512(md5(md4(md2(password))))
}

export function sanitizeHTML(html){
    return striptags(html)
}

export function getRandomArbitrary(min, max){
    return Math.floor(Math.random() * (max - min) + min)
}

export function formatBytes(bytes, decimals = 2){
    if(bytes === 0) return "0 Bytes"

    let k = 1024
    let dm = decimals < 0 ? 0 : decimals
    let sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

    let i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export function uuidv4(){ // Public Domain/MIT
    let d = new Date().getTime();//Timestamp
    let d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function generateRandomString(length = 32){
    return window.btoa(Array.from(window.crypto.getRandomValues(new Uint8Array(length * 2))).map((b) => String.fromCharCode(b)).join("")).replace(/[+/]/g, "").substring(0, length)
}

export function generateRandomClassName(length = 16){
    let result = ""
    let characters = "abcdefghijklmnopqrstuvwxyz"

    for(let i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    return result + "-" + result
}

export function getAPIServer(){
    let servers = [
        "https://api.filen.io",
        "https://api.filen-1.xyz",
        "https://api.filen-2.xyz",
        "https://api.filen-3.xyz",
        "https://api.filen-4.xyz",
        "https://api.filen-5.xyz"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export function fetchWithTimeout(ms, promise) {
    return new Promise((resolve, reject) => {
        let timer = setTimeout(() => {
            return reject(new Error("Request timeout after " + ms + "ms"))
        }, ms)

        promise.then((value) => {
            clearTimeout(timer)
            
            return resolve(value)
        }).catch((err) => {
            clearTimeout(timer)

            return reject(err)
        })
    })
}

export function backgroundAPIRequest(method, endpoint, data = {}){
    let cacheKey = method + endpoint

    const doRequest = (tries, maxTries) => {
		if(tries >= maxTries){
			return console.log("Request failed")
		}

		fetchWithTimeout(60000, fetch(getAPIServer() + endpoint, {
			method: method.toUpperCase(),
			cache: "no-cache",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(data)
		})).then((response) => {
			response.json().then((obj) => {
				window.customVariables.cachedAPIItemListRequests[cacheKey] = obj

				return window.customFunctions.saveAPICache()
			}).catch((err) => {
				console.log(err)

				return doRequest((tries + 1), maxTries)
			})
		}).catch((err) => {
			console.log(err)

			return doRequest((tries + 1), maxTries)
		})
	}

	return doRequest(0, 16)
}

export function apiRequest(method, endpoint, data = {}){
    return new Promise((resolve, reject) => {
        let cacheKey = method + endpoint
        
        /*let useFastCache = false

        if(method.toUpperCase() == "POST"){
            if(endpoint == "/v1/dir/content"
            || endpoint == "/v1/user/shared/in"
            || endpoint == "/v1/user/shared/out"){
                useFastCache = true
            }
        }

        if(useFastCache){
            if(typeof window.customVariables.cachedAPIItemListRequests[cacheKey] !== "undefined"){
                try{
                    let obj = JSON.parse(window.customVariables.cachedAPIItemListRequests[cacheKey])

                    delete window.customVariables.cachedAPIItemListRequests[cacheKey]

                    backgroundAPIRequest(method, endpoint, data)

                    return obj
                }
                catch(e){
                    console.log(e)
                }
            }
        }*/

        if(Capacitor.isNative){
            if(Plugins.Network.getStatus() == "none"){
                if(typeof window.customVariables.apiCache[cacheKey] !== "undefined"){
                    return resolve(window.customVariables.apiCache[cacheKey])
                }
            }
        }

        const doRequest = (tries, maxTries) => {
			if(tries >= maxTries){
				return reject(new Error("Request failed"))
			}

			fetchWithTimeout(60000, fetch(getAPIServer() + endpoint, {
				method: method.toUpperCase(),
				cache: "no-cache",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(data)
			})).then((response) => {
				response.json().then((obj) => {
					if(endpoint == "/v1/dir/content"
					|| endpoint == "/v1/user/baseFolders"
					|| endpoint == "/v1/user/shared/in"
					|| endpoint == "/v1/user/shared/out"
					|| endpoint == "/v1/user/keyPair/info"){
						window.customVariables.apiCache[cacheKey] = obj

						window.customFunctions.saveAPICache()
					}

					return resolve(obj)
				}).catch((err) => {
					console.log(err)

					if(typeof window.customVariables.apiCache[cacheKey] !== "undefined"){
						return resolve(window.customVariables.apiCache[cacheKey])
					}

					return doRequest((tries + 1), maxTries)
				})
			}).catch((err) => {
				console.log(err)

				if(typeof window.customVariables.apiCache[cacheKey] !== "undefined"){
					return resolve(window.customVariables.apiCache[cacheKey])
				}

				return doRequest((tries + 1), maxTries)
			})
		}

		return doRequest(0, 16)
    })
}

export function getDownloadServer(){
    let servers = [
        "https://down.filen-1.xyz",
        "https://down.filen-2.xyz",
        "https://down.filen-3.xyz",
        "https://down.filen-4.xyz",
        "https://down.filen-5.xyz"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export function getUploadServer(){
    let servers = [
        "https://up.filen-1.xyz",
        "https://up.filen-2.xyz",
        "https://up.filen-3.xyz",
        "https://up.filen-4.xyz",
        "https://up.filen-5.xyz"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export function hashFn(val){
    return CryptoJS.SHA1(CryptoJS.SHA512(val).toString()).toString()
}

export function unixTimestamp(){
    return Math.floor((+new Date()) / 1000)
}

export async function decryptFolderName(str, userMasterKeys, uuid = undefined){
	if(str == "default"){
		return "Default"
	}

    let cacheKey = "folder_" + uuid + "_" + str

    if(window.customVariables.cachedMetadata[cacheKey]){
        if(typeof window.customVariables.cachedMetadata[cacheKey].name == "string"){
			if(window.customVariables.cachedMetadata[cacheKey].name.length > 0){
				return window.customVariables.cachedMetadata[cacheKey].name
			}
		}
    }

    let folderName = ""

    if(userMasterKeys.length > 0){
		userMasterKeys = userMasterKeys.reverse()
	}

    let obj = undefined

    for(let i = 0; i < userMasterKeys.length; i++){
		try{
            obj = JSON.parse(await decryptMetadata(str, userMasterKeys[i]))

            if(obj && typeof obj == "object"){
                folderName = obj.name

				break
            }
        }
        catch(e){
            continue
        }
	}

    if(typeof folderName == "string"){
		if(folderName.length > 0){
			window.customVariables.cachedMetadata[cacheKey] = {
				name: folderName
			}
		}
	}

    return folderName
}

export async function decryptFolderNamePrivateKey(str, usrPrivKey, uuid = undefined){
	if(str == "default"){
		return "Default"
	}
	
    let cacheKey = "folder_" + uuid + "_" + str

    if(window.customVariables.cachedMetadata[cacheKey]){
        return window.customVariables.cachedMetadata[cacheKey].name
    }

    let folderName = ""

    try{
        let decrypted = await window.crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, usrPrivKey, _base64ToArrayBuffer(str))

        decrypted = JSON.parse(new TextDecoder().decode(decrypted))

        if(decrypted && typeof decrypted == "object"){
            folderName = decrypted.name
        }
    }
    catch(e){
        console.log(e)
    }

    if(folderName.length > 0){
        window.customVariables.cachedMetadata[cacheKey] = {
            name: folderName
        }
    }

    return folderName
}

export async function decryptFileMetadata(metadata, userMasterKeys, uuid = undefined){
    let cacheKey = "file_" + uuid + "_" + metadata

    if(window.customVariables.cachedMetadata[cacheKey]){
        let file = window.customVariables.cachedMetadata[cacheKey]

        if(typeof file.name == "string"){
			if(file.name.length > 0){
				return {
					name: file.name,
					size: file.size,
					mime: file.mime,
					key: file.key,
					lastModified: file.lastModified
				}
			}
		}
    }

    let fileName = ""
    let fileSize = 0
    let fileMime = ""
    let fileKey = ""
	let fileLastModified = undefined

    if(userMasterKeys.length > 0){
		userMasterKeys = userMasterKeys.reverse()
	}

	for(let i = 0; i < userMasterKeys.length; i++){
		try{
            let obj = JSON.parse(await decryptMetadata(metadata, userMasterKeys[i]))

            if(obj && typeof obj == "object"){
                fileName = obj.name
                fileSize = parseInt(obj.size)
                fileMime = obj.mime
                fileKey = obj.key
				fileLastModified = obj.lastModified

				break
            }
        }
        catch(e){
            continue
        }
	}

    let obj = {
        name: fileName,
        size: fileSize,
        mime: fileMime,
        key: fileKey,
		lastModified: fileLastModified
    }

    if(typeof obj.name == "string"){
		if(obj.name.length >= 1){
			window.customVariables.cachedMetadata[cacheKey] = obj
		}
	}

    return obj
}

export async function decryptFileMetadataPrivateKey(str, usrPrivKey, uuid = undefined){
    let cacheKey = "file_" + uuid + "_" + str

    if(window.customVariables.cachedMetadata[cacheKey]){
        let file = window.customVariables.cachedMetadata[cacheKey]

        return {
            name: file.name,
            size: file.size,
            mime: file.mime,
            key: file.key,
			lastModified: file.lastModified
        }
    }

    let fileName = ""
    let fileSize = 0
    let fileMime = ""
    let fileKey = ""
	let fileLastModified = undefined

    try{
        let decrypted = await window.crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, usrPrivKey, _base64ToArrayBuffer(str))

        decrypted = JSON.parse(new TextDecoder().decode(decrypted))

        if(decrypted && typeof decrypted == "object"){
            fileName = decrypted.name
            fileSize = parseInt(decrypted.size)
            fileMime = decrypted.mime
            fileKey = decrypted.key
			fileLastModified = decrypted.lastModified
        }
    }
    catch(e){
        return {
            name: fileName,
            size: fileSize,
            mime: fileMime,
            key: fileKey,
			lastModified: fileLastModified
        }
    }

    let obj = {
        name: fileName,
        size: fileSize,
        mime: fileMime,
        key: fileKey,
		lastModified: fileLastModified
    }

    if(obj.name.length >= 1){
        window.customVariables.cachedMetadata[cacheKey] = obj
    }

    return obj
}

export function base64ArrayBuffer(arrayBuffer){
    var base64    = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  
    var bytes         = new Uint8Array(arrayBuffer)
    var byteLength    = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength    = byteLength - byteRemainder
  
    var a, b, c, d
    var chunk
  
    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
  
      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63               // 63       = 2^6 - 1
  
      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }
  
    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength]
  
      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
  
      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4 // 3   = 2^2 - 1
  
      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
  
      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4
  
      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2 // 15    = 2^4 - 1
  
      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }
    
    return base64
}

export function selectedItemsDoesNotContainFolder(items){
    for(let i = 0; i < items.length; i++){
        if(items[i].type == "folder" && items[i].selected){
            return false
        }
    }

    return true
}

export function selectedItemsContainsFolder(items){
    for(let i = 0; i < items.length; i++){
        if(items[i].type == "folder" && items[i].selected){
            return true
        }
    }

    return false
}

export function selectedItemsContainsDefaultFolder(items){
    for(let i = 0; i < items.length; i++){
        if(items[i].type == "folder" && items[i].selected){
            if(items[i].uuid == "default" || items[i].uuid == null){
				return true
			}
        }
    }

    return false
}

export function _base64ToArrayBuffer(base64){
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export function fileNameValidationRegex(name){
	if(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$|([<>:"\/\\|?*])|(\.|\s)$/ig.test(name)){
		return true
	}

	return false
}

export function checkIfNameIsBanned(name){
    let banned = [
      "/",
      "\\",
      "?",
      "@",
      "$",
      "%",
      "[",
      "]",
      "{",
      "}",
      "&",
      '"',
      "'",
      "`",
      "*",
      "=",
      "´",
      "<",
      ">",
      ":",
      ";",
      "|",
      "§",
      "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
      "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    ]
  
    let isBanned = false
  
    banned.forEach((ban) => {
      if(name.indexOf(ban) !== -1){
        isBanned = true
      }
    })
  
    return isBanned
  }

export function removeIllegalCharsFromString(str){
    str = str.split("'").join("")
    str = str.split('"').join("")
    str = str.split("´").join("")
    str = str.split("`").join("")
    str = str.split("<").join("")
    str = str.split(">").join("")
    str = str.split("!").join("")
    str = str.split("^").join("")
    str = str.split(":").join("")
    str = str.replace(/(<([^>]+)>)/ig, "")

    return str
}

export function folderNameRegex(name){
    if(name.substring(0, 1) == "." || name.substring(0, 2) == ".."){
        return true
    }
    
    return false
}

export function nameRegex(name){
    return false
}

export function isAlphaNumeric(str){
    var code, i, len;
    
    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
        }
    }
    return true;
}

export function convertWordArrayToUint8Array(wordArray){
    let arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : []
    let length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4
    let uInt8Array = new Uint8Array(length), index=0, word, i

    for(i = 0; i < length; i++){
        word = arrayOfWords[i]

        uInt8Array[index++] = word >> 24
        uInt8Array[index++] = (word >> 16) & 0xff
        uInt8Array[index++] = (word >> 8) & 0xff
        uInt8Array[index++] = word & 0xff
    }

    return uInt8Array
}

export function convertUint8ArrayToBinaryString(u8Array){
    let i, len = u8Array.length, b_str = ""

    for (i = 0; i < len; i++){
        b_str += String.fromCharCode(u8Array[i])
    }

    return b_str
}

export function Semaphore(max){
    var counter = 0;
    var waiting = [];
    
    var take = function() {
      if (waiting.length > 0 && counter < max){
        counter++;
        let promise = waiting.shift();
        promise.resolve();
      }
    }
    
    this.acquire = function() {
      if(counter < max) {
        counter++
        return new Promise(resolve => {
        resolve();
      });
      } else {
        return new Promise((resolve, err) => {
          waiting.push({resolve: resolve, err: err});
        });
      }
    }
      
    this.release = function() {
     counter--;
     take();
    }

	this.count = function() {
		return counter
	}
    
    this.purge = function() {
      let unresolved = waiting.length;
    
      for (let i = 0; i < unresolved; i++) {
        waiting[i].err('Task has been purged.');
      }
    
      counter = 0;
      waiting = [];
      
      return unresolved;
    }
}

export async function decryptFolderLinkKey(str, userMasterKeys){
	let link = ""

    if(userMasterKeys.length > 1){
      	userMasterKeys = userMasterKeys.reverse()
    }

	for(let i = 0; i < userMasterKeys.length; i++){
		try{
            let obj = await decryptMetadata(str, userMasterKeys[i])

            if(obj && typeof obj == "string"){
                if(obj.length >= 16){
                	link = obj

					break
                }
            }
        }
        catch(e){
            continue
        }
	}

    return link
}

export function checkIfItemIsBeingSharedForRename(type, uuid, metaData, optionalCallback){
	let shareCheckDone = false
	let linkCheckDone = false

	let isItDoneInterval = undefined
	let callbackFired = false

	const isItDone = () => {
		if(shareCheckDone && linkCheckDone){
			clearInterval(isItDoneInterval)

			if(typeof optionalCallback == "function" && !callbackFired){
				callbackFired = true

			 	optionalCallback()
			}

			return true
		}
	}

	isItDoneInterval = setInterval(isItDone, 100)

	const checkIfIsSharing = (itemUUID, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/user/shared/item/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: itemUUID
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsSharing(itemUUID, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					callback(false)

					return console.log(res.message)
				}

				return callback(res.data.sharing, res.data.users)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsSharing(itemUUID, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const checkIfIsInFolderLink = (itemUUID, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/link/dir/item/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: itemUUID
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsInFolderLink(itemUUID, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					callback(false)

					return console.log(res.message)
				}

				return callback(res.data.link, res.data.links)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsInFolderLink(itemUUID, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const renameItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/link/dir/item/rename",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						renameItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					renameItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const shareItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/user/shared/item/rename",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						shareItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					shareItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	checkIfIsSharing(uuid, 0, 32, (isSharing, users) => {
		if(!isSharing){
			shareCheckDone = true

			return isItDone()
		}

		let totalUsers = users.length
		let doneUsers = 0

		const doneSharingToUsers = () => {
			doneUsers += 1

			if(doneUsers >= totalUsers){
				shareCheckDone = true

				return isItDone()
			}
		}

		users.forEach((user) => {
			window.crypto.subtle.importKey("spki", _base64ToArrayBuffer(user.publicKey), {
      			name: "RSA-OAEP",
        		hash: "SHA-512"
    		}, true, ["encrypt"]).then((usrPubKey) => {
    			let mData = ""

    			if(type == "file"){
    				mData = JSON.stringify({
	    				name: metaData.name,
	    				size: parseInt(metaData.size),
	    				mime: metaData.mime,
	    				key: metaData.key,
						lastModified: metaData.lastModified
	    			})
				}
				else{
					mData = JSON.stringify({
						name: metaData.name
					})
				}

				window.crypto.subtle.encrypt({
    				name: "RSA-OAEP"
    			}, usrPubKey, new TextEncoder().encode(mData)).then((encrypted) => {
    				shareItem(JSON.stringify({
						apiKey: window.customVariables.apiKey,
						uuid: uuid,
						receiverId: user.id,
						metadata: base64ArrayBuffer(encrypted)
					}), 0, 32, (err) => {
    					if(err){
    						console.log(err)
    					}

    					doneSharingToUsers()
    				})
    			}).catch((err) => {
	    			doneSharingToUsers()
	    		})
    		}).catch((err) => {
    			doneSharingToUsers()
    		})
		})
	})

	checkIfIsInFolderLink(uuid, 0, 32, async (isLinking, links) => {
		if(!isLinking){
			linkCheckDone = true

			return isItDone()
		}

		let userMasterKeys = window.customVariables.userMasterKeys

		let totalLinks = links.length
		let linksDone = 0

		const doneAddingToLink = () => {
			linksDone += 1

			if(linksDone >= totalLinks){
				linkCheckDone = true

				return isItDone()
			}
		}

		for(let i = 0; i < links.length; i++){
			let link = links[i]

			let key = await decryptFolderLinkKey(link.linkKey, userMasterKeys)

			let mData = ""

			if(type == "file"){
				mData = JSON.stringify({
    				name: metaData.name,
    				size: parseInt(metaData.size),
    				mime: metaData.mime,
    				key: metaData.key,
					lastModified: metaData.lastModified
    			})
			}
			else{
				mData = JSON.stringify({
					name: metaData.name
				})
			}

			mData = await encryptMetadata(mData, key)

			renameItem(JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: uuid,
				linkUUID: link.linkUUID,
				metadata: mData
			}), 0, 32, (err) => {
				if(err){
					console.log(err)
				}

				doneAddingToLink()
			})
		}
	})
}

export function checkIfItemParentIsBeingShared(parentUUID, type, metaData, optionalCallback){
    let userMasterKeys = window.customVariables.userMasterKeys

    if(typeof userMasterKeys == "undefined"){
        if(typeof optionalCallback == "function" && !callbackFired){
            callbackFired = true
            
            optionalCallback()
        }
    }

	let shareCheckDone = false
	let linkCheckDone = false

	let isItDoneInterval = undefined
	let callbackFired = false

	const isItDone = () => {
		if(shareCheckDone && linkCheckDone){
			clearInterval(isItDoneInterval)

			if(typeof optionalCallback == "function" && !callbackFired){
				callbackFired = true
				
			 	optionalCallback()
			}

			return true
		}
	}

	isItDoneInterval = setInterval(isItDone, 100)

	const checkIfIsSharing = (parent, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/share/dir/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: parent
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsSharing(parent, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					console.log(res.message)

					return callback(false)
				}

				return callback(res.data.sharing, res.data.users)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsSharing(parent, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const checkIfIsInFolderLink = (parent, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/link/dir/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: parent
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsInFolderLink(parent, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					console.log(res.message)

					return callback(false)
				}

				return callback(res.data.link, res.data.links)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsInFolderLink(parent, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const addItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/dir/link/add",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						addItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					addItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const shareItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/share",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						shareItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					shareItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

    const getFolderInfo = (folderUUID, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/download/dir",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: folderUUID
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						getFolderInfo(folderUUID, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					return callback(new Error(res.message))
				}

				return callback(null, res)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					getFolderInfo(folderUUID, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

    checkIfIsSharing(parentUUID, 0, 128, (status, users) => {
		if(!status){
			shareCheckDone = true

			return isItDone()
		}

		let totalUsers = users.length
		let doneUsers = 0

		const doneSharingToUsers = () => {
			doneUsers += 1

			if(doneUsers >= totalUsers){
				shareCheckDone = true

				return isItDone()
			}
		}

		if(type == "file"){
			users.forEach((user) => {
				window.crypto.subtle.importKey("spki", _base64ToArrayBuffer(user.publicKey), {
	      			name: "RSA-OAEP",
	        		hash: "SHA-512"
	    		}, true, ["encrypt"]).then((usrPubKey) => {
	    			let mData = JSON.stringify({
	    				name: metaData.name,
	    				size: parseInt(metaData.size),
	    				mime: metaData.mime,
	    				key: metaData.key,
						lastModified: metaData.lastModified
	    			})

					window.crypto.subtle.encrypt({
	    				name: "RSA-OAEP"
	    			}, usrPubKey, new TextEncoder().encode(mData)).then((encrypted) => {
	    				shareItem(JSON.stringify({
							apiKey: window.customVariables.apiKey,
							uuid: metaData.uuid,
							parent: parentUUID,
							email: user.email,
							type: type,
							metadata: base64ArrayBuffer(encrypted)
						}), 0, 128, (err) => {
	    					if(err){
	    						console.log(err)
	    					}

	    					doneSharingToUsers()
						})
	    			}).catch((err) => {
		    			doneSharingToUsers()
		    		})
	    		}).catch((err) => {
	    			doneSharingToUsers()
	    		})
			})
		}
		else{
			getFolderInfo(metaData.uuid, 0, 128, async (err, folderData) => {
				if(err){
					return doneSharingToUsers()
				}

				let shareItems = []

				shareItems.push({
					uuid: metaData.uuid,
					parent: parentUUID,
					metadata: metaData.name,
					type: "folder"
				})

				let files = folderData.data.files
				let folders = folderData.data.folders

				for(let i = 0; i < files.length; i++){
					await window.customVariables.decryptShareItemSemaphore.acquire()

					let metadata = files[i].metadata
					let decryptedData = await decryptFileMetadata(metadata, userMasterKeys, files[i].uuid)
					let fName = decryptedData.name
					let fSize = decryptedData.size
					let fMime = decryptedData.mime
					let fKey = decryptedData.key
					let fLastModified = decryptedData.lastModified

					shareItems.push({
						uuid: files[i].uuid,
						parent: files[i].parent,
						metadata: {
							name: fName,
							size: fSize,
							mime: fMime,
							key: fKey,
							lastModified: fLastModified
						},
						type: "file"
					})

					window.customVariables.decryptShareItemSemaphore.release()
				}

				for(let i = 0; i < folders.length; i++){
					if(folders[i].uuid !== metaData.uuid && folders[i].parent !== "base"){
						await window.customVariables.decryptShareItemSemaphore.acquire()

						let dirName = await decryptFolderName(folders[i].name, userMasterKeys, folders[i].uuid)

						shareItems.push({
							uuid: folders[i].uuid,
							parent: (i == 0 ? "none" : folders[i].parent),
							metadata: dirName,
							type: "folder"
						})

						window.customVariables.decryptShareItemSemaphore.release()
					}
				}

				let shareItemsFolderDone = 0

				const isDoneSharingFolder = () => {
					shareItemsFolderDone += 1

					if(shareItemsFolderDone >= shareItems.length){
						return doneSharingToUsers()
					}
				}

				for(let i = 0; i < shareItems.length; i++){
					users.forEach((user) => {
						window.crypto.subtle.importKey("spki", _base64ToArrayBuffer(user.publicKey), {
			      			name: "RSA-OAEP",
			        		hash: "SHA-512"
			    		}, true, ["encrypt"]).then((usrPubKey) => {
			    			let mData = ""

			    			if(shareItems[i].type == "file"){
			    				mData = JSON.stringify({
				    				name: shareItems[i].metadata.name,
				    				size: parseInt(shareItems[i].metadata.size),
				    				mime: shareItems[i].metadata.mime,
				    				key: shareItems[i].metadata.key,
									lastModified: shareItems[i].metadata.lastModified
				    			})
							}
							else{
								mData = JSON.stringify({
									name: shareItems[i].metadata
								})
							}

							window.crypto.subtle.encrypt({
			    				name: "RSA-OAEP"
			    			}, usrPubKey, new TextEncoder().encode(mData)).then((encrypted) => {
			    				shareItem(JSON.stringify({
									apiKey: window.customVariables.apiKey,
									uuid: shareItems[i].uuid,
									parent: shareItems[i].parent,
									email: user.email,
									type: shareItems[i].type,
									metadata: base64ArrayBuffer(encrypted)
								}), 0, 128, (err) => {
			    					if(err){
			    						console.log(err)
			    					}

			    					isDoneSharingFolder()
								})
			    			}).catch((err) => {
				    			isDoneSharingFolder()
				    		})
			    		}).catch((err) => {
			    			isDoneSharingFolder()
			    		})
					})
				}
			})
		}
	})

	checkIfIsInFolderLink(parentUUID, 0, 128, async (status, links) => {
		if(!status){
			linkCheckDone = true

			return isItDone()
		}

		let totalLinks = links.length
		let linksDone = 0

		const doneAddingToLink = () => {
			linksDone += 1

			if(linksDone >= totalLinks){
				linkCheckDone = true

				return isItDone()
			}
		}

		if(type == "file"){
			for(let i = 0; i < links.length; i++){
				let link = links[i]

				let key = await decryptFolderLinkKey(link.linkKey, userMasterKeys)

				let mData = JSON.stringify({
					name: metaData.name,
					size: parseInt(metaData.size),
					mime: metaData.mime,
					key: metaData.key,
					lastModified: metaData.lastModified
				})

				mData = await encryptMetadata(mData, key)

				addItem(JSON.stringify({
					apiKey: window.customVariables.apiKey,
					uuid: metaData.uuid,
					parent: parentUUID,
					linkUUID: link.linkUUID,
					type: type,
					metadata: mData,
					key: link.linkKey,
					expiration: "never",
					password: "empty",
					passwordHashed: hashFn("empty"),
					downloadBtn: "enable"
				}), 0, 128, (err) => {
					if(err){
						console.log(err)
					}

					doneAddingToLink()
				})
			}
		}
		else{
			getFolderInfo(metaData.uuid, 0, 128, async (err, folderData) => {
				if(err){
					return doneAddingToLink()
				}

				let shareItems = []

				shareItems.push({
					uuid: metaData.uuid,
					parent: parentUUID,
					metadata: metaData.name,
					type: "folder"
				})

				let files = folderData.data.files
				let folders = folderData.data.folders

				for(let i = 0; i < files.length; i++){
					await window.customVariables.decryptShareItemSemaphore.acquire()

					let metadata = files[i].metadata
					let decryptedData = await decryptFileMetadata(metadata, userMasterKeys, files[i].uuid)
					let fName = decryptedData.name
					let fSize = decryptedData.size
					let fMime = decryptedData.mime
					let fKey = decryptedData.key
					let fLastModified = decryptedData.lastModified

					shareItems.push({
						uuid: files[i].uuid,
						parent: files[i].parent,
						metadata: {
							name: fName,
							size: fSize,
							mime: fMime,
							key: fKey,
							lastModified: fLastModified
						},
						type: "file"
					})

					window.customVariables.decryptShareItemSemaphore.release()
				}

				for(let i = 0; i < folders.length; i++){
					if(folders[i].uuid !== metaData.uuid && folders[i].parent !== "base"){
						await window.customVariables.decryptShareItemSemaphore.acquire()

						let dirName = await decryptFolderName(folders[i].name, userMasterKeys, folders[i].uuid)

						if(dirName.length > 0){
							shareItems.push({
								uuid: folders[i].uuid,
								parent: (i == 0 ? "none" : folders[i].parent),
								metadata: dirName,
								type: "folder"
							})
						}

						window.customVariables.decryptShareItemSemaphore.release()
					}
				}

				let shareItemsFolderDone = 0

				const isDoneLinkingFolder = () => {
					shareItemsFolderDone += 1

					if(shareItemsFolderDone >= shareItems.length){
						return doneAddingToLink()
					}
				}

				for(let i = 0; i < shareItems.length; i++){
					for(let x = 0; x < links.length; x++){
						let link = links[x]

						let key = await decryptFolderLinkKey(link.linkKey, userMasterKeys)

						let mData = ""

		    			if(shareItems[i].type == "file"){
		    				mData = JSON.stringify({
			    				name: shareItems[i].metadata.name,
			    				size: parseInt(shareItems[i].metadata.size),
			    				mime: shareItems[i].metadata.mime,
			    				key: shareItems[i].metadata.key,
								lastModified: shareItems[i].metadata.lastModified
			    			})
						}
						else{
							mData = JSON.stringify({
								name: shareItems[i].metadata
							})
						}

						mData = await encryptMetadata(mData, key)

						addItem(JSON.stringify({
							apiKey: window.customVariables.apiKey,
							uuid: shareItems[i].uuid,
							parent: shareItems[i].parent,
							linkUUID: link.linkUUID,
							type: shareItems[i].type,
							metadata: mData,
							key: link.linkKey,
							expiration: "never",
							password: "empty",
							passwordHashed: hashFn("empty"),
							downloadBtn: "enable"
						}), 0, 128, (err) => {
							if(err){
								console.log(err)
							}

							isDoneLinkingFolder()
						})
					}
				}
			})
		}
	})
}

export function currentParentFolder(){
    let ex = window.location.href.split("/")

    return ex[ex.length - 1]
}

export function canCompressThumbnail(ext){
    switch(ext.toLowerCase()){
        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
            return true
        break
        default:
            return false
        break
    }
}

export function canShowThumbnail(ext){
    switch(ext.toLowerCase()){
        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
        case "svg":
        case "mp4":
        case "webm":
        case "avi":
        case "mov":
        case "wmv":
            return true
        break
        default:
            return false
        break
    }
}

export function getFilePreviewType(ext, mime = undefined){
    switch(ext.toLowerCase()){
      case "jpeg":
      case "jpg":
      case "png":
      case "gif":
      case "svg":
        return "image"
      break
      case "mp3":
      case "mp2":
      case "wav":
      case "ogg":
      case "m4a":
      case "aac":
      case "flac":
      case "midi":
      case "xmf":
      case "rtx":
      case "ota":
      case "mpa":
      case "aif":
      case "rtttl":
      case "wma":
        return "audio"
      break
      case "mp4":
      case "webm":
      case "mkv":
      case "flv":
      case "mov":
      case "ogv":
      case "3gp":
      case "avi":
        return "video"
      break
      case "json":
      case "js":
      case "md":
      case "php":
      case "css":
      case "c":
      case "perl":
      case "html":
      case "html5":
      case "jsx":
      case "php5":
      case "yml":
      case "md":
      case "xml":
      case "sql":
      case "java":
      case "csharp":
      case "dist":
      case "py":
      case "cc":
      case "cpp":
      case "log":
      case "conf":
      case "cxx":
      case "ini":
      case "lock":
      case "bat":
      case "sh":
      case "properties":
      case "cfg":
      case "ahk":
      //case "ts":
      case "tsx":
        return "code"
      break
      case "txt":
      case "rtf":
        return "text"
      break
      case "pdf":
        return "pdf"
      break
      default:
        return "none"
      break
    }
}

export function escapeHTML(str){
    if(typeof str !== "string"){
      return str
    }
  
    if(str.length == 0){
      return str
    }
  
    return str.replace(/(<([^>]+)>)/ig, "")
}

export function getFileIconFromName(name){
    let ex = name.split(".")

    return getFileIcon(ex[ex.length - 1].toLowerCase())
}

export function getFileIcon(ext){
    switch(ext.toLowerCase()){
      case "pdf":
        return `assets/img/types/pdf.svg`
      break
      case "doc":
      case "docx":
        return `assets/img/types/doc.svg`
      break
      case "exe":
        return `assets/img/types/exe.svg`
      break
      case "mp3":
        return `assets/img/types/mp3.svg`
      break
      case "json":
        return `assets/img/types/json-file.svg`
      break
      case "png":
        return `assets/img/types/png.svg`
      break
      //case "ico":
      //  return `assets/img/types/ico.svg`
      //break
      case "txt":
        return `assets/img/types/txt.svg`
      break
      case "jpg":
      case "jpeg":
        return `assets/img/types/jpg.svg`
      break
      case "iso":
        return `assets/img/types/iso.svg`
      break
      case "js":
        return `assets/img/types/javascript.svg`
      break
      case "html":
        return `assets/img/types/html.svg`
      break
      case "css":
        return `assets/img/types/css.svg`
      break
      case "csv":
        return `assets/img/types/csv.svg`
      break
      case "avi":
        return `assets/img/types/avi.svg`
      break
      case "mp4":
        return `assets/img/types/mp4.svg`
      break
      case "ppt":
        return `assets/img/types/ppt.svg`
      break
      case "zip":
        return `assets/img/types/zip.svg`
      break
      case "rar":
      case "tar":
      case "tgz":
      case "gz":
      case "gzip":
        return `assets/img/types/zip-1.svg`
      break
      case "txt":
        return `assets/img/types/txt.svg`
      break
      case "svg":
        return `assets/img/types/svg.svg`
      break
      case "xml":
        return `assets/img/types/xml.svg`
      break
      case "dwg":
        return `assets/img/types/dwg.svg`
      break
      case "fla":
        return `assets/img/types/fla.svg`
      break
      case "ai":
        return `assets/img/types/ai.svg`
      break
      default:
        return `assets/img/types/file.svg`
      break
    }
}

export function uInt8ArrayConcat(arrays){
    // sum of individual array lengths
    let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
  
    if (!arrays.length) return null;
  
    let result = new Uint8Array(totalLength);
  
    // for each array - copy it over result
    // next array is copied right after the previous one
    let length = 0;
    for(let array of arrays) {
      result.set(array, length);
      length += array.length;
    }
  
    return result;
}

export function orderItemsByType(items, type){
    let files = []
    let folders = []

    for(let i = 0; i < items.length; i++){
        if(items[i].type == "file"){
            files.push(items[i])
        }
        else{
            folders.push(items[i])
        }
    }

    if(type == "nameAsc"){
        let sortedFiles = files.sort((a, b) => {
            return a.name.localeCompare(b.name)
        })

        let sortedFolders = folders.sort((a, b) => {
            return a.name.localeCompare(b.name)
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "sizeAsc"){
        let sortedFiles = files.sort((a, b) => {
            return a.size - b.size
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "dateAsc"){
        let sortedFiles = files.sort((a, b) => {
            return a.timestamp - b.timestamp
        })

        let sortedFolders = folders.sort((a, b) => {
            return a.timestamp - b.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "typeAsc"){
        let sortedFiles = files.sort((a, b) => {
            if(typeof a.mime == "undefined"){
                a.mime = "_"
            }

            if(typeof b.mime == "undefined"){
                b.mime = "_"
            }

            if(a.mime.length <= 1){
                a.mime = "_"
            }

            if(b.mime.length <= 1){
                b.mime = "_"
            }

            return a.mime.localeCompare(b.mime)
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "nameDesc"){
        let sortedFiles = files.sort((a, b) => {
            return b.name.localeCompare(a.name)
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.name.localeCompare(a.name)
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "sizeDesc"){
        let sortedFiles = files.sort((a, b) => {
            return b.size - a.size
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "typeDesc"){
        let sortedFiles = files.sort((a, b) => {
            if(typeof a.mime == "undefined"){
                a.mime = "_"
            }

            if(typeof b.mime == "undefined"){
                b.mime = "_"
            }

            if(a.mime.length <= 1){
                a.mime = "_"
            }

            if(b.mime.length <= 1){
                b.mime = "_"
            }

            return b.mime.localeCompare(a.mime)
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else{
        //default, dateDesc

        let sortedFiles = files.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
}

export function getVideoCover(file, seekTo = 0.0) {
    return new Promise((resolve, reject) => {
        // load the file to a video player
        const videoPlayer = document.createElement('video');
        videoPlayer.setAttribute('src', URL.createObjectURL(file));
        videoPlayer.load();
        videoPlayer.addEventListener('error', (ex) => {
            reject("error when loading video file", ex);
        });
        // load metadata of the video to get video duration and dimensions
        videoPlayer.addEventListener('loadedmetadata', () => {
            // seek to user defined timestamp (in seconds) if possible
            if (videoPlayer.duration < seekTo) {
                reject("video is too short.");
                return;
            }

            if(videoPlayer.duration >= 1){
            	seekTo = 1.0
            }

            // delay seeking or else 'seeked' event won't fire on Safari
            setTimeout(() => {
              videoPlayer.currentTime = seekTo;
            }, 200);
            // extract video thumbnail once seeking is complete
            videoPlayer.addEventListener('seeked', () => {
                // define a canvas to have the same dimension as the video
                const canvas = document.createElement("canvas");
                canvas.width = videoPlayer.videoWidth;
                canvas.height = videoPlayer.videoHeight;
                // draw the video frame to canvas
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
                // return the canvas image as a blob
                ctx.canvas.toBlob(
                    blob => {
                        resolve(blob);
                    },
                    "image/jpeg",
                    1 /* quality */
                );
            });
        });
    });
}

export function stripHtml(html){
   let tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
}

export function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

export function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}

export function getLanguageSelection(){
    return `
        <ion-select-option value="en">English</ion-select-option>
        <ion-select-option value="de">Deutsch</ion-select-option>
        <ion-select-option value="nl">Nederlands</ion-select-option>
        <ion-select-option value="hi">हिन्दी, हिंदी</ion-select-option>
        <ion-select-option value="fr">Français</ion-select-option>
        <ion-select-option value="da">Dansk</ion-select-option>
        <ion-select-option value="es">Español</ion-select-option>
    `
}

export function getFolderColorStyle(color = null, onlyColor = false){
	let folderColorStyle = ""

	switch(color){
		case "default":
            folderColorStyle = "style='color: #F6C358;'"
            
            if(onlyColor){
                folderColorStyle = "#F6C358"
            }
		break
		case "blue":
            folderColorStyle = "style='color: #2992E5;'"
            
            if(onlyColor){
                folderColorStyle = "#2992E5"
            }
		break
		case "green":
            folderColorStyle = "style='color: #57A15B;'"
            
            if(onlyColor){
                folderColorStyle = "#57A15B"
            }
		break
		case "purple":
            folderColorStyle = "style='color: #8E3A9D;'"
            
            if(onlyColor){
                folderColorStyle = "#8E3A9D"
            }
		break
		case "red":
            folderColorStyle = "style='color: #CB2E35;'"
            
            if(onlyColor){
                folderColorStyle = "#CB2E35"
            }
		break
		case "gray":
            folderColorStyle = "style='color: gray;'"
            
            if(onlyColor){
                folderColorStyle = "gray"
            }
		break
		default:
            folderColorStyle = "style='color: #F6C358;'"
            
            if(onlyColor){
                folderColorStyle = "#F6C358"
            }
		break
	}

	return folderColorStyle
}

export function copyTextToClipboardWeb(text){
	var textArea = document.createElement("textarea")

	textArea.style.position = "fixed"
	textArea.style.top = 0
	textArea.style.left = 0
	textArea.style.width = "2em"
	textArea.style.height = "2em"
	textArea.style.padding = 0
	textArea.style.border = "none"
	textArea.style.outline = "none"
	textArea.style.boxShadow = "none"
	textArea.style.background = "transparent"

	textArea.value = text

	document.body.appendChild(textArea)

	textArea.focus()
	textArea.select()

	try{
		document.execCommand("copy")
	}
	catch(e){
		return console.log(e)
	}

	//alert("Link copied to clipboard!")

	return document.body.removeChild(textArea)
}

export async function renderEventRow(event, userMasterKeys, lang = "en"){
	let eventDate = (new Date(event.timestamp * 1000)).toString().split(" ")
	let dateString = eventDate[1] + ` ` + eventDate[2] + ` ` + eventDate[3] + ` ` + eventDate[4]

	let str = ""

	switch(event.type){
		case "fileUploaded":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` uploaded
			`
		break
		case "fileVersioned":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` versioned
			`
		break
		case "versionedFileRestored":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` versioned file restored
			`
		break
		case "fileMoved":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` moved
			`
		break
		case "fileRenamed":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)
			var decryptedOld = await decryptFileMetadata(event.info.oldMetadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decryptedOld.name) + ` renamed to` + escapeHTML(decrypted.name) + `
			`
		break
		case "fileTrash":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` moved to trash
			`
		break
		case "fileRm":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` deleted permanently
			`
		break
		case "fileRestored":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` restored from trash
			`
		break
		case "fileShared":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` shared with ` + event.info.receiverEmail + `
			`
		break
		case "fileLinkEdited":
			var decrypted = await decryptFileMetadata(event.info.metadata, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted.name) + ` public link edited
			`
		break
		case "folderTrash":
			var decrypted = await decryptFolderName(event.info.name, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted) + ` moved to trash
			`
		break
		case "folderShared":
			var decrypted = await decryptFolderName(event.info.name, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted) + ` shared with ` + event.info.receiverEmail + `
			`
		break
		case "folderMoved":
			var decrypted = await decryptFolderName(event.info.name, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted) + ` moved
			`
		break
		case "folderRenamed":
			var decrypted = await decryptFolderName(event.info.name, userMasterKeys, event.info.uuid)
			var decryptedOld = await decryptFolderName(event.info.oldName, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decryptedOld) + ` renamed to ` + escapeHTML(decrypted) + `
			`
		break
		case "subFolderCreated":
		case "baseFolderCreated":
			var decrypted = await decryptFolderName(event.info.name, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted) + ` created
			`
		break
		case "folderRestored":
			var decrypted = await decryptFolderName(event.info.name, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted) + ` restored from trash
			`
		break
		case "folderColorChanged":
			var decrypted = await decryptFolderName(event.info.name, userMasterKeys, event.info.uuid)

			str += `
				` + escapeHTML(decrypted) + ` color changed
			`
		break
		case "login":
			str += `
				Logged in
			`
		break
		case "deleteVersioned":
			str += `
				All versioned files deleted permanently
			`
		break
		case "deleteAll":
			str += `
				All files and folders deleted permanently
			`
		break
		case "deleteUnfinished":
			str += `
				All unfinished uploads deleted permanently
			`
		break
		case "trashEmptied":
			str += `
				Trash emptied
			`
		break
		case "requestAccountDeletion":
			str += `
				Requested account deletion
			`
		break
		case "2faEnabled":
			str += `
				Two Factor Authentication enabled
			`
		break
		case "2faDisabled":
			str += `
				Two Factor Authentication disabled
			`
		break
		case "codeRedeemed":
			str += `
				Redeemed code ` + event.info.code + `
			`
		break
		case "emailChanged":
			str += `
				Email changed to ` + event.info.email + `
			`
		break
		case "passwordChanged":
			str += `
				Password changed
			`
		break
		case "removedSharedInItems":
			str += `
				Removed ` + event.info.count + ` items shared by ` + event.info.sharerEmail + `
			`
		break
		case "removedSharedOutItems":
			str += `
				Stopped sharing ` + event.info.count + ` items with ` + event.info.receiverEmail + `
			`
		break
		default:
			//str = event.type
			str = ""
		break
	}

	if(str.length == 0){
		return ""
	}

	return `
        <ion-item button onClick="window.customFunctions.openEventDetailsModal('` + event.uuid + `')">
            <ion-label>
                ` + str + `
            </ion-label>
        </ion-item>
	`
}

export function buf2hex(buffer) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function deriveKeyFromPassword (password, salt, iterations = 200000, hash = "SHA-512", bitLength = 512, returnHex = true){	
	try{
        var bits = await window.crypto.subtle.deriveBits({
            name: "PBKDF2",
          salt: new TextEncoder().encode(salt),
          iterations: iterations,
          hash: {
            name: hash
          }
        }, await window.crypto.subtle.importKey("raw", new TextEncoder().encode(password), {
            name: "PBKDF2"
        }, false, ["deriveBits"]), bitLength)
    }
    catch(e){
        throw new Error(e)
    }
  
    if(returnHex){
      return buf2hex(bits)
    }

    return bits
}

export async function encryptMetadata(data, key){
  data = data.toString()
  key = key.toString()

  let metadataVersion = 1

  if(typeof window.customVariables.currentMetadataVersion == "number"){
	  metadataVersion = window.customVariables.currentMetadataVersion
  }

  if(metadataVersion == 1){ //old deprecated
    try{
      return CryptoJS.AES.encrypt(data, key).toString()
    }
    catch(e){
      console.log(e)

      return ""
    }
  }
  else if(metadataVersion == 2){
    try{
      key = await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false) //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

      let iv = generateRandomString(12)
      let string = new TextEncoder().encode(data)

      let encrypted = await window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: new TextEncoder().encode(iv)
      }, await window.crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]), string)

      return "002" + iv + base64ArrayBuffer(new Uint8Array(encrypted))
    }
    catch(e){
      console.log(e)

      return ""
    }
  }
}

export async function decryptMetadata(data, key){
  data = data.toString()
  key = key.toString()

  let sliced = data.slice(0, 8)

  if(sliced == "U2FsdGVk"){ //old deprecated
    try{
      let dec = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8)

      return dec
    }
    catch(e){
          return ""
      }
  }
  else{
    let version = data.slice(0, 3)

    if(version == "002"){
      try{
        key = await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false) //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

        let iv = new TextEncoder().encode(data.slice(3, 15))
        let encrypted = _base64ToArrayBuffer(data.slice(15))

        let decrypted = await window.crypto.subtle.decrypt({
          name: "AES-GCM",
          iv
        }, await window.crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]), encrypted)

        return new TextDecoder().decode(new Uint8Array(decrypted))
      }
      catch(e){
        return ""
      }
    }
    else{
      return ""
    }
  }
}

export function compareVersions(current, got){
	function compare(a, b) {
		if (a === b) {
		   return 0;
		}
	
		var a_components = a.split(".");
		var b_components = b.split(".");
	
		var len = Math.min(a_components.length, b_components.length);

		for (var i = 0; i < len; i++) {
			if (parseInt(a_components[i]) > parseInt(b_components[i])) {
				return 1;
			}
	
			if (parseInt(a_components[i]) < parseInt(b_components[i])) {
				return -1;
			}
		}
	
		if (a_components.length > b_components.length) {
			return 1;
		}
	
		if (a_components.length < b_components.length) {
			return -1;
		}
	
		return 0;
	}

	let res = compare(current, got)

	if(res == -1){
		return "update"
	}
	else{
		return "ok"
	}
}

export function moveCursorToStart(id, querySelector = false) {
	if(querySelector){
		var el = document.querySelector(id) 
	}
	else{
		var el = document.getElementById(id) 
	}
	el.focus()
	if (typeof el.selectionStart == "number") {
	  el.selectionStart = el.selectionEnd = 0;
	} else if (typeof el.createTextRange != "undefined") {           
	  var range = el.createTextRange();
	  range.collapse(false);
	  range.select();
	}
  }

export function fileOrFolderNameValid(name){
	let regex = /[<>:"\/\\|?*\x00-\x1F]|^(?:aux|con|clock\$|nul|prn|com[1-9]|lpt[1-9])$/i;
  
	if(regex.test(name)){
	  return true
	}
  
	return false
}