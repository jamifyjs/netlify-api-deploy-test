const crypto = require ('crypto-hash')
const stream = require('stream')
require('dotenv').config()

const NetlifyAPI = require('netlify')
const client = new NetlifyAPI(process.env.NETLIFY_API_TOKEN)
const site_id = 'b8d481fc-f70c-45f8-9242-3936c27fe7e6'

const fetch = require('node-fetch')

const uploadFile = async ({ deployId, path, buffer }) => {
    const bufferStream = new stream.PassThrough()
    bufferStream.end(buffer)

    const result = await client.uploadDeployFile({
     	deployId,
     	path,
     	body: bufferStream,
    })

    return result
}

const directUploadFile = async ({ deployId, path, buffer }) => {

    const uri = `https://api.netlify.com/api/v1/deploys/${deployId}/files/${path}`
    
    const options = {
      method: 'PUT',
      headers: {
      	'Authorization': `Bearer ${process.env.NETLIFY_API_TOKEN}`,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    }

    const result = await fetch(uri, options)
    return await result.json()
}

const upload = async () => {
	let files = []
	try {
		files = await client.listSiteFiles({ site_id })
	} catch (e) {
		console.log(e.json)
	}

	let existingFiles = {}
	files.forEach(({ path, sha }) => { 
		existingFiles[`${path}`] = sha
	})

	const now = new Date()
	const newFileBuf = Buffer.from(now.toISOString())

	const sha = await crypto.sha1(newFileBuf)
	const key = `/static/${sha}/now.txt`
	const newFile = {}
	newFile[key] = sha
	let deploy = []
	try {
		deploy = await client.createSiteDeploy({ 
			site_id,
			body: {
				files: {
					...existingFiles,
					...newFile
				}
			}
		})
	} catch (e) {
		console.log(e.json)
	} 

	const { id: deployId, required } = deploy
	if( required.length === 0 ) {
		console.log('nothing to upload (1)')
		return
	}

	if (!required.includes(sha)) {
		console.log('nothing to upload (2)')
		return
	}

	const uploadList = [{
		deployId,
		path: key,
		buffer: newFileBuf
	}]
	//console.log(uploadList)

	result = await Promise.all(
		//uploadList.map(item => uploadFile(item))
		uploadList.map(item => directUploadFile(item))
	)
	console.log('Why are all fields capitalized, even without the js-client?')
	console.log(result)

	//console.log('.. but other endpoints are *NOT* capitalized?')
	//let site
	//try {
	//	site = await client.getSite({ site_id })
	//} catch (e) {
	//	console.log(e.json)
	//}
	//console.log(site)

}

upload()
